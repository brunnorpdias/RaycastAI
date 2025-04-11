import { showToast, Toast } from "@raycast/api";

import OpenAI from "openai";
import fs from 'fs';
import path from "path";
import os from 'os';
import { API_KEYS } from '../enums/api_keys';

import { type Data } from "../utils/types";
import { type StreamPipeline } from "../views/answer";
import { ResponseCreateParamsStreaming, ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";

type Input = string | Array<{
  role: 'user' | 'assistant' | 'system',
  content: Content
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
  // make privacy switch to enable / disable storage at OpenAI
  // get id from the server
  const input: Input = await GenerateInput(data)
  const inputWithFiles: Input = await AddFiles(data, input)
  const responsesObject = await ResponsesObject(data, inputWithFiles) as ResponseCreateParamsStreaming;
  GenerateStreaming(responsesObject, streamPipeline, data)
}


export async function TitleConversation(data: Data) {
  let input: Input = await GenerateInput(data)
  if (typeof input !== 'string') {
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
  } else {
    // add logic retrieving responses by using the id
    showToast({ title: 'Title couldn\'t be created', style: Toast.Style.Failure })
  }
}


export async function Transcribe(data: Data, streamPipeline: StreamPipeline) {
  const lastMsg = data.messages.at(-1)
  if (!lastMsg) return
  const prompt: string = typeof lastMsg.content === 'string' ? lastMsg.content : '';
  const stream = await openai.audio.transcriptions.create({
    file: fs.createReadStream(data.attachments[0].path),
    model: "gpt-4o-transcribe",
    prompt: prompt,
    response_format: 'json', //  "text",
    stream: true,
  });

  let isStreaming = false;
  for await (const event of stream) {
    if (event.type === 'transcript.text.delta') {
      streamPipeline(event.delta, 'streaming')
      if (!isStreaming) {
        isStreaming = true;
        showToast({ title: 'Streaming', style: Toast.Style.Animated })
      }
    } else if (event.type === 'transcript.text.done') {
      streamPipeline('', 'done')
    } else {
      showToast({ title: "Encountered unexpected event", style: Toast.Style.Failure })
      console.log('Not planned')
    }
  }
}


export async function STT(text: string) {
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
  let input: Input;
  if (!data.private) {
    input = data.messages
      .map(({ id, timestamp, fileData, ...msg }) => {
        return {
          ...msg,
          content: typeof msg.content === 'string' ?
            msg.content :
            msg.content.filter(item => ['input_text', 'input_file', 'input_image'].includes(item.type)) as Content
        }
      })
      .filter(msg => msg.role === 'user' || msg.role === 'assistant' || msg.role === 'system') as Input
  } else {
    const lastMsgUser = data.messages.filter(msg => msg.role === 'user').at(-1)
    input = typeof lastMsgUser?.content === 'string' ? lastMsgUser.content : lastMsgUser?.content.at(-1)?.text || '';
  }
  return input
}


async function AddFiles(data: Data, input: Input) {
  const lastInput = typeof input === 'string' ? input : input.at(-1);
  const lastInputContent = typeof lastInput === 'string' ? lastInput : lastInput?.content;
  const attachmentsQueue = data.attachments.filter(({ status }) => status !== 'uploaded')

  if (
    data.attachments?.length === 0 ||
    !lastInput || !lastInputContent || !attachmentsQueue
  ) {
    return input;
  }

  const prompt: string =
    typeof lastInputContent === 'string' ?
      lastInputContent :
      lastInputContent[0].text ? lastInputContent[0].text : ''  // assumes text is on first position

  let content: Content = [{
    type: 'input_text',
    text: prompt
  }]  // this message's content

  for (const attachment of attachmentsQueue) {
    if (!['pdf', 'jpg', 'png', 'webp', 'gif'].includes(attachment.extension)) break  // only accept pdf and images
    const arrayBuffer = fs.readFileSync(attachment.path);
    const base64String = arrayBuffer.toString('base64');
    const type = attachment.extension === 'pdf' ? 'input_file' : 'input_image';
    const isPDF: boolean = attachment.extension === 'pdf';
    if (data.private) {
      content.push({
        type: type,
        filename: isPDF ? attachment.name : undefined,
        file_data: isPDF ? `data:application/pdf;base64,${base64String}` : undefined,
        image_url: !isPDF ? `data:image/${attachment.extension};base64,${base64String}` : undefined,
      })
      attachment.status = 'staged';
    } else {
      showToast({ title: 'Uploading file', style: Toast.Style.Animated })
      const file = await openai.files.create({
        file: fs.createReadStream(attachment.path),
        purpose: 'user_data',
      })
      content.push({
        type: type,
        file_id: file.id
      })
      attachment.status = 'uploaded';
      attachment.id = file.id
      showToast({ title: 'File Uploaded', style: Toast.Style.Success })
    }
  }

  if (data.private) {
    const lastMessage = data.messages.at(-1);
    // use assert instead
    if (lastMessage) {
      lastMessage.content = content;  // update local data with new content
    }
  }

  let inputWithFiles: Input;
  if (typeof input !== 'string') {
    inputWithFiles = [
      ...input.slice(0, -1),
      { role: 'user', content: content }
    ]
  } else {
    inputWithFiles = [
      { role: 'user', content: content }
    ]
  }

  return inputWithFiles
}


async function ResponsesObject(data: Data, input: Input) {
  const previousResponseId: string | null = data.messages
    .filter(msg => msg.role === 'assistant')
    .at(-1)?.id || null
  let responsesObject = {
    input: input,
    model: data.model,
    tools: data.tools === 'web' ? [{ type: 'web_search' }] : undefined,
    instructions: data.instructions.length > 0 ? data.instructions : undefined,
    reasoning: data.reasoning !== 'none' ? { effort: data.reasoning } : undefined,
    store: !data.private ? true : false,
    previous_response_id: !data.private ? previousResponseId : undefined,
    // tools: [],
    temperature: data.temperature,
    stream: true,
  }
  return responsesObject
}


async function GenerateStreaming(responsesObject: ResponseCreateParamsStreaming, streamPipeline: Function, data: Data) {
  const stream = await openai.responses.create(responsesObject);
  let id: string = '';
  for await (const event of stream) {
    if (event.type === 'response.created') {
      showToast({ title: 'Request Received', style: Toast.Style.Success })
      id = event.response.id;
    } else if (event.type === 'response.content_part.added') {
      showToast({ title: 'Streaming', style: Toast.Style.Animated })
    } else if (event.type === 'response.output_text.delta') {
      streamPipeline(event.delta, 'streaming')
    } else if (event.type === 'response.completed') {
      // event.response.usage?.total_tokens
      streamPipeline('', 'done', id)
      // console.log(`id: ${id}`)
      data.attachments.map(att => att.status === 'staged' ? att.status = 'uploaded' : att)
      break;
    }
  }
}
