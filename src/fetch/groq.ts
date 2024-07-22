// "use strict";
import { API_KEYS } from "../enums/index";
const Groq = require("groq-sdk");

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

const groq = new Groq({
  apiKey: API_KEYS.GROQ
});

export async function GroqAPI(data: Data, onResponse: (response: string, status: string) => void) {
  const messages = data.conversation.map(({ timestamp, ...rest }) => rest) as Messages;

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
