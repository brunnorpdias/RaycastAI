import { showToast, Toast } from "@raycast/api";
import OpenAI from "openai";
import { ChatCompletionChunk } from "openai/resources";
import { API_KEYS } from '../enums';

import { type Data } from "../form";
import { type StreamPipeline } from "../answer";


const openai = new OpenAI({
  apiKey: API_KEYS.DEEPMIND,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

export async function RunChat(data: Data, streamPipeline: StreamPipeline) {
  const conversation = data.messages.map(({ id, ...msg }) => (
    {
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
    }
  ));

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
    temperature: data.temperature,
    stream: true
  })

  let streaming = false;
  const stream = completion as AsyncIterable<ChatCompletionChunk>;
  for await (const chunk of stream) {
    if (typeof chunk.choices[0].delta.content === "string") {
      if (!streaming) {
        showToast({ title: 'Streaming', style: Toast.Style.Animated })
        streaming = true;
      };
      streamPipeline(chunk.choices[0].delta.content, "streaming");
    };

    if (chunk.choices[0].finish_reason == 'stop') {
      streamPipeline('', 'done');
      break;
    };
  }
}
