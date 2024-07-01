// "use strict";
import { API_KEYS } from "../enums/index";
const Groq = require("groq-sdk");

type Data = {
  conversation: Array<{ role: 'user' | 'assistant' | 'system', content: string }>;
  api: string;
  model: string;
  temperature: number;
  stream: boolean;
  timestamp: number;
};

const groq = new Groq({
  apiKey: API_KEYS.GROQ
});

export async function GroqAPI(data: Data, onResponse: (response: string, status: string) => void) {
  const chat = groq.chat.completions.create({
    messages: data.conversation,
    model: data.model,
    temperature: data.temperature,
    stream: data.stream
  });

  const completions = await chat;

  if (data.stream) {
    for await (const chunk of completions) {
      if (chunk.choices[0]?.finish_reason != 'stop') {
        onResponse(chunk.choices[0]?.delta.content, "")
      } else {
        onResponse("", "done")
        break;
      }
    }
  } else {
    onResponse(completions.choices[0]?.message.content, 'done')
  }
}
