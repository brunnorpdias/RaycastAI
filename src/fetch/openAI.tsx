import { showToast, Toast } from "@raycast/api";

import OpenAI from "openai";
import fs from 'fs';
import path from "path";
import os from 'os';

import { API_KEYS } from '../config/api_keys';
import * as ModelInfo from '../utils/models';
import { type StreamPipeline } from "../views/answer";
import { ResponseCreateParamsStreaming, ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";
import assert from "assert";

type Input = Array<{
  role: 'user' | 'assistant' | 'system',
  content: Content,
  timestamp?: number,
}>;

type Content = string | Array<{
  type: 'input_text' | 'input_file' | 'input_image',
  text?: string,
  filename?: string,
  image_url?: string,
  file_id?: string,
  file_data?: string,
}>;


const openai = new OpenAI({ apiKey: API_KEYS.OPENAI });

export async function Responses(data: ModelInfo.Data, streamPipeline: StreamPipeline) {
  const input: Input = await GenerateInput(data)
  const inputWithFiles: Input = await AddFiles(data, input)
  const responsesObject = await ResponsesObject(data, inputWithFiles) as ResponseCreateParamsStreaming;
  GenerateStreaming(responsesObject, streamPipeline, data)
}


export async function TitleConversation(data: ModelInfo.Data) {
  let input: Input = await GenerateInput(data)
  input = input.map(({ timestamp, ...rest }) => rest)  // remove timestamps from the messages (used to match files on responses)
  assert(Array.isArray(input), 'Input has an incorrect format')
  input.push({ role: 'user', content: 'Give a short and descriptive title to the chat without mentioning so or using special characters. The title must describe the intention of the user.' })
  let responsesObject = {
    input: input,
    model: 'gpt-4.1-mini',
    stream: false,
  }
  showToast({ title: 'Creating a title', style: Toast.Style.Animated })
  const response = await openai.responses.create(responsesObject as ResponseCreateParamsNonStreaming);
  showToast({ title: 'Title created' });
  return response.output_text
}


export async function STT(data: ModelInfo.Data, streamPipeline: StreamPipeline) {
  const lastMsg = data.messages.at(-1)
  if (!lastMsg) return
  const prompt: string = lastMsg.content ?? '';
  const file = data.files.at(0);
  assert(file !== undefined, 'File was not found')
  const filePath = path.join(ModelInfo.storageDir, `${file.hash}.${file.extension}`);
  const stream = await openai.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: "gpt-4o-transcribe",
    prompt: prompt,
    response_format: 'json', //  "text",
    stream: true,
  });

  let isStreaming = false;
  for await (const event of stream) {
    if (event.type === 'transcript.text.delta') {
      streamPipeline({
        apiResponse: event.delta,
        apiStatus: 'streaming',
      })

      if (!isStreaming) {
        isStreaming = true;
        showToast({ title: 'Streaming', style: Toast.Style.Animated })
      }
    } else if (event.type === 'transcript.text.done') {
      streamPipeline({
        apiResponse: '',
        apiStatus: 'done',
      })
    } else {
      showToast({ title: "Encountered unexpected event", style: Toast.Style.Failure })
      // console.log('Not planned')
    }
  }
}



export async function TTS(text: string) {
  const speechFile = path.resolve(os.homedir(), "Downloads", "RaycastAI_speech.wav");

  try {
    showToast({ title: 'Generating Audio', style: Toast.Style.Animated })
    const audio = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: text,
      response_format: "wav"
      // instructions: "Speak in a cheerful and positive tone.",
    });
    const buffer = Buffer.from(await audio.arrayBuffer());
    await fs.promises.writeFile(speechFile, buffer);
    if (buffer) showToast({ title: 'Audio is ready', style: Toast.Style.Success })
  } catch (err) {
    showToast({ title: 'Error generating audio', style: Toast.Style.Failure })
  }
}



//  Helper Functions  //
async function GenerateInput(data: ModelInfo.Data) {
  const timestamps: number[] = data.files.map(file => file.timestamp);
  if (data.files.length <= 0) return data.messages.map(({ timestamp, id, tokenCount, ...rest }) => rest)

  let input: Input = data.messages.map(({ role, content, timestamp }) => {
    if (role === 'user' && timestamps.includes(timestamp)) {
      return {
        role: role,
        content: [{ type: 'input_text', text: content }],
        timestamp: timestamp
      }
    } else {
      return {
        role: role,
        content: content
      }
    }
  })

  return input
}


async function AddFiles(data: ModelInfo.Data, input: Input) {
  if (data.files.length < 1) return input
  let inputWithFiles = [...input]
  for (const file of data.files) {
    const filePath = path.join(ModelInfo.storageDir, `${file.hash}.${file.extension}`);
    const arrayBuffer = fs.readFileSync(filePath);
    const fileName = file.name;
    const fileExtension = file.extension;
    let item: Input[number] | undefined = inputWithFiles.find(item => item.timestamp === file.timestamp);

    assert(arrayBuffer !== undefined, 'File not found')
    assert(Array.isArray(item?.content), 'Content attribute was not converted to array format')
    assert(fileExtension && fileName, 'Error parsing file name and extension')
    assert(['pdf', 'jpg', 'png', 'webp', 'gif'].includes(fileExtension), `File type ${fileExtension} not supported`)

    // manual conversation state management
    const base64 = arrayBuffer.toString('base64');
    assert(base64, 'Attachment data not found')
    item.content.push({
      type: fileExtension === 'pdf' ? 'input_file' : 'input_image',
      filename: fileExtension === 'pdf' ? fileName : undefined,
      file_data: fileExtension === 'pdf' ? `data:application/pdf;base64,${base64}` : undefined,
      image_url: ['jpg', 'png', 'webp', 'gif'].includes(fileExtension) ? `data:image/${fileExtension};base64,${base64}` : undefined,
    })
    file.status = 'staged';
  }

  inputWithFiles = inputWithFiles.map(({ timestamp, ...rest }) => rest)
  return inputWithFiles
}


async function ResponsesObject(data: ModelInfo.Data, input: Input) {
  const max_output_tokens = (
    data.model === 'o3' || data.model === 'o3-pro' || data.model === 'o4-mini' ?
      100000 :
      32000
  )
  const token_divider = (
    data.reasoning === 'none' ? 8 :
      data.reasoning === 'low' ? 4 :
        data.reasoning === 'medium' ? 2 :
          1
  )

  let responsesObject = {
    input: input,
    model: data.model,
    instructions: data.instructions.length > 0 ? data.instructions : undefined,
    reasoning: data.reasoning === 'none' || data.reasoning === undefined ?
      undefined :
      {
        effort: data.reasoning,
        summary: 'detailed'
      },
    tools: data.tools?.includes('web') ?
      [{
        type: 'web_search',
        user_location: {
          type: "approximate",
          country: "GB",
          city: "London",
          region: "London"
        }
      }] :
      undefined,
    max_output_tokens: max_output_tokens / token_divider,
    stream: true,
    temperature: data.temperature
  }

  return responsesObject
}


async function GenerateStreaming(responsesObject: ResponseCreateParamsStreaming, streamPipeline: StreamPipeline, data: ModelInfo.Data) {
  let responseID = undefined;
  const stream = await openai.responses.create(responsesObject);
  for await (const event of stream) {
    if (event.type === 'response.created') {
      showToast({ title: 'Request Received', style: Toast.Style.Success })
      responseID = event.response.id;
      streamPipeline({ apiStatus: 'received' })
    } else if (event.type === 'response.output_item.added' && event.item.type === 'reasoning') {
      showToast({ title: 'Thinking...', style: Toast.Style.Animated })
    } else if (event.type === 'response.reasoning_summary_text.delta') {
      streamPipeline({ apiResponse: event.delta, apiStatus: 'thinking' })
    } else if (event.type === 'response.content_part.added') {
      streamPipeline({ apiStatus: 'reset' })
      showToast({ title: 'Streaming', style: Toast.Style.Animated })
    } else if (event.type === 'response.output_text.delta') {
      streamPipeline({ apiResponse: event.delta, apiStatus: 'streaming' })
    } else if (event.type === 'response.completed') {
      let promptTokens: number | undefined = event.response.usage?.input_tokens;
      let responseTokens: number | undefined = event.response.usage?.output_tokens;
      streamPipeline({
        apiResponse: '',
        apiStatus: 'done',
        responseID: responseID ?? undefined,
        promptTokens: promptTokens,
        responseTokens: responseTokens,
      })
      data.files.map(att => att.status === 'staged' ? att.status = 'uploaded' : att)
      break;
    }
  }
}


export async function DeepResearchImprovements(data: ModelInfo.Data, streamPipeline: StreamPipeline) {
  const clarifying_instruction = `
  You will be given a research task by a user. Your job is NOT to complete the task yet, but instead to ask clarifying questions that would help you or another researcher produce a more specific, efficient, and relevant answer.

  GUIDELINES:
  1. **Maximize Relevance**
  - Ask questions that are *directly necessary* to scope the research output.
  - Consider what information would change the structure, depth, or direction of the answer.
  2. **Surface Missing but Critical Dimensions**
  - Identify essential attributes that were not specified in the user’s request (e.g., preferences, time frame, budget, audience).
  - Ask about each one *explicitly*, even if it feels obvious or typical.
  3. **Do Not Invent Preferences**
  - If the user did not mention a preference, *do not assume it*. Ask about it clearly and neutrally.
  4. **Use the First Person**
  - Phrase your questions from the perspective of the assistant or researcher talking to the user (e.g., “Could you clarify...” or “Do you have a preference for...”)
  5. **Use a Bulleted List if Multiple Questions**
  - If there are multiple open questions, list them clearly in bullet format for readability.
  6. **Avoid Overasking**
  - Prioritize the 3–6 questions that would most reduce ambiguity or scope creep. You don’t need to ask *everything*, just the most pivotal unknowns.
  7. **Include Examples Where Helpful**
  - If asking about preferences (e.g., travel style, report format), briefly list examples to help the user answer.
  8. **Format for Conversational Use**
  - The output should sound helpful and conversational—not like a form. Aim for a natural tone while still being precise.
  `

  const improvement_instruction = `
  You will be given a research task by a user. Your job is to produce a set of instructions for a researcher that will complete the task. Do NOT complete the task yourself, just provide instructions on how to complete it.

  GUIDELINES:
  1. **Maximize Specificity and Detail**
  - Include all known user preferences and explicitly list key attributes or dimensions to consider.
  - It is of utmost importance that all details from the user are included in the instructions.
  2. **Fill in Unstated But Necessary Dimensions as Open-Ended**
  - If certain attributes are essential for a meaningful output but the user has not provided them, explicitly state that they are open-ended or default to no specific constraint.
  3. **Avoid Unwarranted Assumptions**
  - If the user has not provided a particular detail, do not invent one.
  - Instead, state the lack of specification and guide the researcher to treat it as flexible or accept all possible options.
  4. **Use the First Person**
  - Phrase the request from the perspective of the user.
  5. **Tables**
  - If you determine that including a table will help illustrate, organize, or enhance the information in the research output, you must explicitly request that the researcher provide them.
  Examples:
  - Product Comparison (Consumer): When comparing different smartphone models, request a table listing each model's features, price, and consumer ratings side-by-side.
  - Project Tracking (Work): When outlining project deliverables, create a table showing tasks, deadlines, responsible team members, and status updates.
  - Budget Planning (Consumer): When creating a personal or household budget, request a table detailing income sources, monthly expenses, and savings goals.
  Competitor Analysis (Work): When evaluating competitor products, request a table with key metrics, such as market share, pricing, and main differentiators.
  6. **Headers and Formatting**
  - You should include the expected output format in the prompt.
  - If the user is asking for content that would be best returned in a structured format (e.g. a report, plan, etc.), ask the researcher to format as a report with the appropriate headers and formatting that ensures clarity and structure.
  7. **Language**
  - If the user input is in a language other than English, tell the researcher to respond in this language, unless the user query explicitly asks for the response in a different language.
  8. **Sources**
  - If specific sources should be prioritized, specify them in the prompt.
  - For product and travel research, prefer linking directly to official or primary websites (e.g., official brand sites, manufacturer pages, or reputable e-commerce platforms like Amazon for user reviews) rather than aggregator sites or SEO-heavy blogs.
  - For academic or scientific queries, prefer linking directly to the original paper or official journal publication rather than survey papers or secondary summaries.
  - If the query is in a specific language, prioritize sources published in that language.
  `

  let input = data.messages.map(({ timestamp, id, tokenCount, ...rest }) => rest)
  const stream: boolean = data.workflowState === 'dr_clarifying' ? true : false;

  const response = await openai.responses.create({
    model: 'gpt-4.1',
    instructions: data.workflowState === 'dr_clarifying' ? clarifying_instruction : improvement_instruction,
    input: input,
    stream: false
  })

  assert(response, 'No response from the api')
  streamPipeline({ apiResponse: response.output_text, apiStatus: 'done' })
}

// export async function DeepResearchImprovePrompt(data: ModelInfo.Data) {

// const openai = new OpenAI({
//   apiKey: API_KEYS.OPENAI,
//   timeout: ModelInfo.deepResearchTimeout
// });

