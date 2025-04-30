import { showToast, Toast } from "@raycast/api";

import OpenAI from "openai";
import fs from 'fs';
import path from "path";
import os from 'os';
import { API_KEYS } from '../enums/api_keys';

import { type Data } from "../utils/types";
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
  assert(Array.isArray(input), 'Input has an incorrect format')
  input.push({ role: 'user', content: 'Give a short and descriptive title to the chat without mentioning so or using special characters. The title must describe the intention of the user.' })
  let responsesObject = {
    input: input,
    model: 'gpt-4o-mini',
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
  const stream = await openai.audio.transcriptions.create({
    file: fs.createReadStream(data.files[0].path),
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

  let input: Input = data.messages.map(({ id, timestamp, tokenCount, ...rest }) => {
    if (rest.role === 'user' && timestamps.includes(timestamp)) {
      return {
        ...rest,
        timestamp: timestamp,
        content: [{ type: 'input_text', text: rest.content }],
      }
    } else {
      return rest
    }
  })

  return input
}


async function AddFiles(data: Data, input: Input) {
  if (data.files.length < 1) return input
  let inputWithFiles = [...input]
  for (const file of data.files) {
    const fileName: string | undefined = file.path.slice(file.path.lastIndexOf('/') + 1, file.path.lastIndexOf('.'))
    const fileExtension: string | undefined = file.path.slice(file.path.lastIndexOf('.') + 1)
    let item: Input[number] | undefined = inputWithFiles.find(item => item.timestamp === file.timestamp);
    assert(Array.isArray(item?.content), 'Content attribute was not converted to array format')
    assert(fileExtension && fileName, 'Error parsing file name and extension')
    assert(['pdf', 'jpg', 'png', 'webp', 'gif'].includes(fileExtension), `File type ${fileExtension} not supported`)

    if (data.private) {
      const base64 = file.rawData?.toString('base64');
      assert(base64, 'Attachment data not found')
      item.content.push({
        type: fileExtension === 'pdf' ? 'input_file' : 'input_image',
        filename: fileExtension === 'pdf' ? fileName : undefined,
        file_data: fileExtension === 'pdf' ? `data:application/pdf;base64,${base64}` : undefined,
        image_url: ['jpg', 'png', 'webp', 'gif'].includes(fileExtension) ? `data:image/${fileExtension};base64,${base64}` : undefined,
      })
      file.status = 'staged';
    } else {
      if (file.status !== 'uploaded') {
        assert(inputWithFiles.length === 1, 'Input has unexpected size')
        showToast({ title: 'Uploading file', style: Toast.Style.Animated })
        const uploadedFile = await openai.files.create({
          file: fs.createReadStream(file.path),
          purpose: 'user_data',
        })
        assert(uploadedFile.id !== undefined, 'File not uploaded')
        item.content.push({
          type: fileExtension === 'pdf' ? 'input_file' : 'input_image',
          file_id: uploadedFile.id
        })
        file.id = uploadedFile.id
        file.status = 'uploaded';
        showToast({ title: `File ${fileName} was uploaded`, style: Toast.Style.Success })
      }
    }
  }

  inputWithFiles = inputWithFiles.map(({ timestamp, ...rest }) => rest)
  return inputWithFiles
}


async function ResponsesObject(data: Data, input: Input) {
  const previousResponseId: string | null = data.messages
    .filter(msg => msg.role === 'assistant')
    .at(-1)?.id || null

  let responsesObject = {
    input: input,
    model: data.model,
    instructions: data.instructions.length > 0 ? data.instructions : undefined,
    reasoning: data.reasoning !== 'none' ? { effort: data.reasoning } : undefined,
    store: !data.private ? true : false,
    previous_response_id: !data.private ? previousResponseId : undefined,
    tools: data.tools === 'web' ? [{ type: 'web_search' }] : undefined,
    max_output_tokens: data.model === 'gpt-4.1' || data.model === 'gpt-4.1-mini' ? 32000 : undefined,
    stream: true,
    temperature: 1,
  }

  return responsesObject
}


async function GenerateStreaming(responsesObject: ResponseCreateParamsStreaming, streamPipeline: StreamPipeline, data: Data) {
  let id: string = '';
  const stream = await openai.responses.create(responsesObject);
  for await (const event of stream) {
    if (event.type === 'response.created') {
      showToast({ title: 'Request Received', style: Toast.Style.Success })
      id = event.response.id;
    } else if (event.type === 'response.output_item.added' && event.item.type === 'reasoning') {
      showToast({ title: 'Thinking...', style: Toast.Style.Animated })
    } else if (event.type === 'response.content_part.added') {
      showToast({ title: 'Streaming', style: Toast.Style.Animated })
    } else if (event.type === 'response.output_text.delta') {
      streamPipeline({
        apiResponse: event.delta,
        apiStatus: 'streaming',
      })
    } else if (event.type === 'response.completed') {
      let promptTokens: number | undefined = event.response.usage?.input_tokens;
      let responseTokens: number | undefined = event.response.usage?.output_tokens;
      streamPipeline({
        apiResponse: '',
        apiStatus: 'done',
        msgID: id,
        promptTokens: promptTokens,
        responseTokens: responseTokens,
      })
      data.files.map(att => att.status === 'staged' ? att.status = 'uploaded' : att)
      break;
    }
  }
}
