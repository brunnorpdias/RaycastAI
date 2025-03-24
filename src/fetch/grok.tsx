import OpenAI from "openai";
import { ChatCompletionChunk } from "openai/resources";
import { API_KEYS } from '../enums';
import { showToast, Toast } from "@raycast/api";

import { type Data } from "../form";
import { type StreamPipeline } from "../answer";


export async function RunChat(data: Data, streamPipeline: StreamPipeline) {
  const messages = data.messages.map(({ id, ...msg }) => (
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
  // console.log(completion.choices[0].message);


  let streaming = false;
  const stream = completion as AsyncIterable<ChatCompletionChunk>;
  for await (const chunk of stream) {
    // console.log(JSON.stringify(chunk));
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
