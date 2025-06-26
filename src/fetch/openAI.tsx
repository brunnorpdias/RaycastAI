import { showToast, Toast } from "@raycast/api";

import OpenAI from "openai";
import fs from 'fs';
import path from "path";
import os from 'os';

import { API_KEYS } from '../config/api_keys';
import { type Data, storageDir } from "../utils/models";
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

export async function Responses(data: Data, streamPipeline: StreamPipeline) {
  const input: Input = await GenerateInput(data)
  const inputWithFiles: Input = await AddFiles(data, input)
  const responsesObject = await ResponsesObject(data, inputWithFiles) as ResponseCreateParamsStreaming;
  GenerateStreaming(responsesObject, streamPipeline, data)
}


export async function TitleConversation(data: Data) {
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


export async function STT(data: Data, streamPipeline: StreamPipeline) {
  const lastMsg = data.messages.at(-1)
  if (!lastMsg) return
  const prompt: string = lastMsg.content ?? '';
  const file = data.files.at(0);
  assert(file !== undefined, 'File was not found')
  const filePath = path.join(storageDir, `${file.hash}.${file.extension}`);
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
async function GenerateInput(data: Data) {
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


async function AddFiles(data: Data, input: Input) {
  if (data.files.length < 1) return input
  let inputWithFiles = [...input]
  for (const file of data.files) {
    const filePath = path.join(storageDir, `${file.hash}.${file.extension}`);
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


async function ResponsesObject(data: Data, input: Input) {
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
    tools: data.tools === 'web' ?
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


async function GenerateStreaming(responsesObject: ResponseCreateParamsStreaming, streamPipeline: StreamPipeline, data: Data) {
  let responseID = undefined;
  const stream = await openai.responses.create(responsesObject);
  for await (const event of stream) {
    if (event.type === 'response.created') {
      showToast({ title: 'Request Received', style: Toast.Style.Success })
      responseID = event.response.id;
      streamPipeline({ apiStatus: 'processing' })
    } else if (event.type === 'response.output_item.added' && event.item.type === 'reasoning') {
      showToast({ title: 'Thinking...', style: Toast.Style.Animated })
      // streamPipeline({ apiResponse: '# Thinking\n', apiStatus: 'thinking' })
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
