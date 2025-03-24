import { showToast, Toast } from "@raycast/api";
import OpenAI from "openai";
import { API_KEYS } from '../enums';
import fs from 'fs';

import { type Data } from "../form";
import { type StreamPipeline } from "../answer";
import { ChatCompletionCreateParamsStreaming } from "openai/resources/chat";

type Messages = Array<{
  role: 'user' | 'assistant' | 'system',
  content: string | Array<{
    type: 'text' | 'file' | 'document' | 'image',
    text?: string,
    file?: object,
  }>,
}>;


export async function RunChat(data: Data, streamPipeline: StreamPipeline) {
  let messages: Messages = data.messages.map(({ id, ...msg }) => msg)
  const msgWithFiles: Messages = await addFiles(data, messages)
  const completionInput = await CompletionInput(data, msgWithFiles) as ChatCompletionCreateParamsStreaming;
  CreateStream(completionInput, streamPipeline)
}


async function addFiles(data: Data, messages: Messages) {
  if (data.attachments && ['gpt-4o', 'gpt-4o-mini', 'gpt-4.5-preview', 'o1'].includes(data.model)) {
    // file has no persistance, on future use filter?
    const lastMessage = data.messages.at(-1);
    const attachmentsQueue = data.attachments  // .filter(({ status }) => status !== 'uploaded')
    if (lastMessage && attachmentsQueue) {
      const prompt: string = typeof lastMessage.content === 'string' ? lastMessage.content : '';
      let content: Messages[0]["content"] = [{
        type: 'text',
        text: prompt
      }]
      for (const attachment of attachmentsQueue) {
        const arrayBuffer = fs.readFileSync(attachment.path);  //limit of one file
        const base64String = arrayBuffer.toString('base64');
        content.push({
          type: 'file',
          file: {
            filename: attachment.name,  // limitation of one file
            file_data: `data:application/pdf;base64,${base64String}`
          }
        })
        attachment.status = 'uploaded';
      }
      const msgWithFiles: Messages = lastMessage ?
        [...messages.slice(0, -1), { ...lastMessage, content: content }] :
        [...messages]
      return msgWithFiles
    }
  }
  return messages
}

async function CompletionInput(data: Data, messages: Messages) {
  let reasoning_effort;
  if (data.reasoning != 'none') {
    reasoning_effort = data.reasoning;
  } else {
    reasoning_effort = undefined
  }
  const systemMessage = data.systemMessage;
  if (systemMessage && String(systemMessage)) {
    messages = [
      { role: 'system', content: systemMessage },
      ...messages
    ];
  }
  let completionInput: object;
  if (data.model == 'o3-mini' || data.model == 'o1') {
    completionInput = {
      model: data.model,
      reasoning_effort: reasoning_effort,
      messages: messages,
      temperature: data.temperature,
      // store: true
    }
  } else if (data.model == 'gpt-4o-search-preview') {
    completionInput = {
      model: data.model,
      messages: messages,
    }
  } else {
    completionInput = {
      model: data.model,
      messages: messages,
      temperature: data.temperature,
    };
  }
  return completionInput
}

async function CreateStream(completionInput: ChatCompletionCreateParamsStreaming, streamPipeline: Function) {
  const openai = new OpenAI({ apiKey: API_KEYS.OPENAI });
  const stream = await openai.chat.completions.create(completionInput);
  let isStreaming = false;
  for await (const chunk of stream) {
    if (typeof chunk.choices[0].delta.content === "string") {
      if (!isStreaming) {
        showToast({ title: 'Streaming', style: Toast.Style.Animated })
        isStreaming = true;
      };
      streamPipeline(chunk.choices[0].delta.content, "streaming");
    } else if (chunk.choices[0].finish_reason == 'stop') {
      streamPipeline('', 'done');
      break;
    };
  }
}


//  Other OpenAI Functions  //
export async function TitleConversation(data: Data) {
  showToast({ title: 'Creating a title', style: Toast.Style.Animated })
  const openai = new OpenAI({ apiKey: API_KEYS.OPENAI });
  const messages = data.messages.map(({ id, ...msg }) => ({
    role: msg.role,
    content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
  }
  ));

  const chat = await openai.chat.completions.create({
    messages: [
      ...messages,
      {
        role: 'user',
        content: 'Give a short and descriptive title to the chat without mentioning so or using special characters. The title must describe the intention of the user.'
      }
    ],
    model: 'gpt-4o-mini',
    stream: false,
  });

  showToast({ title: 'Title created' });
  return chat.choices[0]?.message.content
}
