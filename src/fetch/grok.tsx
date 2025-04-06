import { showToast, Toast } from "@raycast/api";
import OpenAI from "openai";

import { API_KEYS } from '../enums/api_keys';

import { ChatCompletionChunk } from "openai/resources";
import { type Data } from "../utils/types";
import { type StreamPipeline } from "../answer";


export async function RunChat(data: Data, streamPipeline: StreamPipeline) {
  const messages = data.messages.map(({ timestamp, id, ...msg }) => (
    {
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
    }
  ));

  const client = new OpenAI({
    apiKey: API_KEYS.GROK,
    baseURL: "https://api.x.ai/v1",
  });

  const completion = await client.chat.completions.create({
    model: "grok-2-latest",
    messages: messages,
    temperature: data.temperature,
    stream: true,
  });


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
