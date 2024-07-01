import OpenAI from "openai";
import { ChatCompletionChunk, ChatCompletion } from "openai/resources";
import { API_KEYS } from '../enums';
import fs from 'fs';

type Data = {
  conversation: Array<{ role: 'user' | 'assistant' | 'system', content: string }>;
  api: string;
  model: string;
  temperature: number;
  stream: boolean;
  timestamp: number;
};

type AssistantData = {
  assistant: string;
  conversation: Array<{ role: 'user' | 'assistant' | 'system', content: string }>;
  instructions: string;
  files: string[];
  model: string;
  temperature: number;
  timestamp: number;
  assistantID: string;
  threadID: string;
};

export async function OpenAPI(data: Data, onResponse: (response: string, status: string) => void) {
  const openai = new OpenAI(
    { apiKey: API_KEYS.OPENAI }
  );

  const completion = await openai.chat.completions.create({
    model: data.model,
    messages: data.conversation,
    temperature: data.temperature,
    stream: data.stream,
  });

  if (data.stream) {
    const streamCompletion = completion as AsyncIterable<ChatCompletionChunk>;
    for await (const chunk of streamCompletion) {
      if (typeof chunk.choices[0].delta.content === "string") {
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


export async function Assistant(data: AssistantData, onResponse: (response: string, status: string) => void) {
  const openai = new OpenAI(
    { apiKey: API_KEYS.OPENAI }
  );

  const completion = await openai.chat.completions.create({
    model: data.model,
    messages: data.conversation,
    temperature: data.temperature,
    stream: true,
  });

  const streamCompletion = completion as AsyncIterable<ChatCompletionChunk>;
  for await (const chunk of streamCompletion) {
    if (typeof chunk.choices[0].delta.content === "string") {
      onResponse(chunk.choices[0].delta.content, "streaming");
    };
    if (chunk.choices[0].finish_reason == 'stop') {
      onResponse('', 'done');
      break;
    };
  }
}
