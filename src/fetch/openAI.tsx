import { showToast, Toast } from "@raycast/api";

import OpenAI from "openai";
import fs from 'fs';
import { API_KEYS } from '../enums/index';

import { type Data } from "../form";
import { type StreamPipeline } from "../answer";
import { ResponseCreateParamsStreaming, ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";

type Input = Array<{
  role: 'user' | 'assistant' | 'system',
  content: string | Array<{
    type: 'input_text' | 'input_file' | 'input_image',
    text?: string,
    filename?: string,
    file_data?: string,
  }>,
}>;


export async function RunChat(data: Data, streamPipeline: StreamPipeline) {
  // make privacy switch to enable / disable storage at OpenAI
  // get id from the server
  const input: Input = await GenerateInput(data)
  const inputWithFiles: Input = await AddFiles(data, input)
  const responsesObject = await ResponsesObject(data, inputWithFiles) as ResponseCreateParamsStreaming;
  GenerateStreaming(responsesObject, streamPipeline)
}


export async function TitleConversation(data: Data) {
  const openai = new OpenAI({ apiKey: API_KEYS.OPENAI });
  let input: Input = await GenerateInput(data)
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


//  Helper Functions  //
async function GenerateInput(data: Data) {
  let input: Input = data.messages
    .map(({ id, timestamp, ...msg }) => {
      return {
        ...msg,
        content: typeof msg.content === 'string' ?
          msg.content :
          msg.content
            .filter(item => ['input_text', 'input_file', 'input_image'].includes(item.type)) as Input[0]["content"]
      }
    })
  return input
}


async function AddFiles(data: Data, input: Input) {
  if (data.attachments?.length > 0 && ['gpt-4o', 'gpt-4o-mini', 'gpt-4.5-preview', 'o1'].includes(data.model)) {
    const lastInput = input.at(-1)
    const lastInputContent = lastInput?.content;
    // file has no persistance, on future use filter?
    const attachmentsQueue = data.attachments  // .filter(({ status }) => status !== 'uploaded')
    if (lastInput && lastInputContent && attachmentsQueue) {
      const prompt: string =
        typeof lastInputContent === 'string' ?
          lastInputContent :
          lastInputContent[0].text ? lastInputContent[0].text : '' // assumes text is on first position
      let content: Input[0]["content"] = [{
        type: 'input_text',
        text: prompt
      }]
      for (const attachment of attachmentsQueue) {
        const arrayBuffer = fs.readFileSync(attachment.path);
        const base64String = arrayBuffer.toString('base64');
        content.push({
          type: 'input_file',
          filename: attachment.name,  // limitation of one file
          file_data: `data:application/pdf;base64,${base64String}`
        })
        attachment.status = 'uploaded';
      }
      const inputWithFiles: Input =
        lastInput ?
          [...input.slice(0, -1), { ...lastInput, content: content }] :
          [...input]
      return inputWithFiles
    }
  }
  return input
}


async function ResponsesObject(data: Data, input: Input) {
  let reasoning_effort;
  if (data.reasoning != 'none') {
    reasoning_effort = data.reasoning;
  } else {
    reasoning_effort = undefined
  }
  let responsesObject = {
    input: input,
    model: data.model,
    instructions: data.instructions.length > 0 ? data.instructions : undefined,
    reasoning: ['o1', 'o3-mini'].includes(data.model) && reasoning_effort ? { effort: reasoning_effort } : null,
    // store: true
    // previous_response_id: 
    // tools: [],
    temperature: data.temperature,
    stream: true,
  }
  return responsesObject
}


async function GenerateStreaming(responsesObject: ResponseCreateParamsStreaming, streamPipeline: Function) {
  const openai = new OpenAI({ apiKey: API_KEYS.OPENAI });
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
      break;
    }
  }
}
