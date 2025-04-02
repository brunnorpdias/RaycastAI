import { showToast, Toast } from "@raycast/api";

import OpenAI from "openai";
import fs from 'fs';
import { API_KEYS } from '../enums/index';

import { type Data } from "../form";
import { type StreamPipeline } from "../answer";
import { ResponseCreateParamsStreaming, ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";

type Input = string | Array<{
  role: 'user' | 'assistant' | 'system',
  content: Content
}>;

type Content = string | Array<{
  type: 'input_text' | 'input_file' | 'input_image',
  text?: string,
  filename?: string,
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
  const stream = await openai.audio.transcriptions.create({
    file: fs.createReadStream(data.attachments[0].path),
    model: "gpt-4o-transcribe",
    response_format: 'json', //  "text",
    stream: true,
  });

  // console.log(transcription.text);
  // streamPipeline(transcription.text, 'done')
  for await (const event of stream) {
    console.log(event);
    if (event.type === 'transcript.text.delta') {
      showToast({ title: 'Streaming', style: Toast.Style.Animated })
      streamPipeline(event.delta, 'streaming')
    } else if (event.type === 'transcript.text.done') {
      streamPipeline('', 'done')
    } else {
      showToast({ title: "Encountered unexpected event", style: Toast.Style.Failure })
      console.log('Not planned')
    }
  }
}



//  Helper Functions  //
async function GenerateInput(data: Data) {
  let input: Input;
  if (data.private) {
    input = data.messages
      .map(({ id, timestamp, ...msg }) => {
        return {
          ...msg,
          content: typeof msg.content === 'string' ?
            msg.content :
            msg.content
              .filter(item => ['input_text', 'input_file', 'input_image'].includes(item.type)) as Content
        }
      })
  } else {
    const lastMsgUser = data.messages.filter(msg => msg.role === 'user').at(-1)
    input = typeof lastMsgUser?.content === 'string' ? lastMsgUser.content : lastMsgUser?.content.at(-1)?.text || '';
  }
  return input
}


async function AddFiles(data: Data, input: Input) {
  if (data.attachments?.length === 0 || !['gpt-4o', 'gpt-4o-mini', 'gpt-4.5-preview', 'o1'].includes(data.model)) return input;
  const lastInput = typeof input === 'string' ? input : input.at(-1);
  const lastInputContent = typeof lastInput === 'string' ? lastInput : lastInput?.content;
  const attachmentsQueue = data.attachments.filter(({ status }) => status !== 'uploaded')

  if (!lastInput || !lastInputContent || !attachmentsQueue) return input
  const prompt: string =
    typeof lastInputContent === 'string' ?
      lastInputContent :
      lastInputContent[0].text ? lastInputContent[0].text : '' // assumes text is on first position

  let content: Content = [{
    type: 'input_text',
    text: prompt
  }]

  for (const attachment of attachmentsQueue) {
    const arrayBuffer = fs.readFileSync(attachment.path);
    const base64String = arrayBuffer.toString('base64');
    if (data.private) {
      content.push({
        type: 'input_file',
        filename: attachment.name,  // limitation of one file
        file_data: `data:application/pdf;base64,${base64String}`
      })
      attachment.status = 'staged';
      attachment.data = base64String;
    } else {
      showToast({ title: 'Uploading file', style: Toast.Style.Animated })
      const file = await openai.files.create({
        file: fs.createReadStream(attachment.path),
        purpose: 'user_data',
      })
      content.push({
        type: 'input_file',
        file_id: file.id
      })
      attachment.status = 'uploaded';
      attachment.id = file.id
      showToast({ title: 'File Uploaded', style: Toast.Style.Success })
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
    reasoning: ['o1', 'o3-mini'].includes(data.model) && data.reasoning ? { effort: data.reasoning } : null,
    store: data.private ? false : true,
    previous_response_id: data.private ? null : previousResponseId,
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
      streamPipeline('', 'done', id)
      data.attachments.map(att => att.status === 'staged' ? att.status = 'uploaded' : att)
      break;
    }
  }
}
