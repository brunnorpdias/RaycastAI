// "use strict";
import { API_KEYS } from "../enums/index";
const Groq = require("groq-sdk");
import { type Data } from "../chat_form";

type Messages = Array<{ role: 'user' | 'assistant', content: string }>;

const groq = new Groq({
  apiKey: API_KEYS.GROQ
});

export async function GroqAPI(data: Data, onResponse: (response: string, status: string) => void) {
  const messages = data.messages.map(({ timestamp, ...msg }) => (
    {
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
    }
  ));

  const chat = groq.chat.completions.create({
    messages: messages,
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
