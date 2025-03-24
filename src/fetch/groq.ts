import { API_KEYS } from "../enums/index";
import Groq from "groq-sdk";

import { type Data } from "../form";
import { type StreamPipeline } from "../answer";


export async function GroqAPI(data: Data, streamPipeline: StreamPipeline) {
  const groq = new Groq({
    apiKey: API_KEYS.GROQ
  });

  const messages = data.messages.map(({ id, ...msg }) => (
    {
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
    }
  ));

  const completion = groq.chat.completions.create({
    messages: messages,
    model: data.model,
    temperature: data.temperature,
    stream: true
  });
  const stream = await completion;

  for await (const chunk of stream) {
    if (chunk.choices[0]?.finish_reason != 'stop') {
      streamPipeline(chunk.choices[0]?.delta.content || '', "done")
    } else {
      streamPipeline("", "done")
      break;
    }
  }
}
