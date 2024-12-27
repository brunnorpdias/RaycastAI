import { showToast, Toast } from "@raycast/api";
import OpenAI from "openai";
import { ChatCompletionChunk, ChatCompletion } from "openai/resources";
import { API_KEYS } from '../enums';

type Data = {
  id: number;
  temperature: number;
  conversation: Array<{ role: 'user' | 'assistant', content: string, timestamp: number }>;
  model: string;
  api?: string;
  systemMessage?: string;
  instructions?: string;
  stream?: boolean;
  assistantID?: string;
  threadID?: string;
  runID?: string;
  attachments?: Array<{ file_id: string, tools: Array<{ type: 'code_interpreter' | 'file_search' }> }>;
};

type Messages = Array<{ role: 'user' | 'assistant', content: string }>;

const openai = new OpenAI({
  apiKey: API_KEYS.DEEPMIND,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

export async function RunChat(data: Data, onResponse: (response: string, status: string) => void) {
  const conversation = data.conversation.map(({ timestamp, ...rest }) => rest); // remove timestamp parameter

  let messages: Array<{ role: 'user' | 'assistant' | 'system', content: string }>;
  if (data.systemMessage) {
    messages = [
      { role: 'system', content: data.systemMessage },
      ...conversation
    ];
  } else {
    messages = conversation;
  }

  const completion = await openai.chat.completions.create({
    model: data.model,
    messages: messages,
    // temperature: data.temperature,
    stream: data.stream
  })

  let streaming = false;
  if (data.stream) {
    const stream = completion as AsyncIterable<ChatCompletionChunk>;
    for await (const chunk of stream) {
      if (typeof chunk.choices[0].delta.content === "string") {
        if (!streaming) {
          showToast({ title: 'Streaming', style: Toast.Style.Animated })
          streaming = true;
        };
        onResponse(chunk.choices[0].delta.content, "streaming");
      };

      if (chunk.choices[0].finish_reason == 'stop') {
        onResponse('', 'done');
        break;
      };
    }
  } else {
    const chatCompletion = completion as ChatCompletion;
    onResponse(chatCompletion.choices[0].message.content as string, 'done');
  }
}

