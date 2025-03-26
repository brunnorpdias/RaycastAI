import { showToast, Toast } from "@raycast/api";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

import { API_KEYS } from '../enums/index';

import { ChatCompletionChunk } from "openai/resources";
import { type Data } from "../form";
import { type StreamPipeline } from "../answer";


const openai = new OpenAI({
  apiKey: API_KEYS.DEEPMIND,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

export async function RunOpenAI(data: Data, streamPipeline: StreamPipeline) {
  const conversation = data.messages.map(({ timestamp, id, ...msg }) => (
    {
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
    }
  ));

  let messages: Array<{ role: 'user' | 'assistant' | 'system', content: string }>;
  if (data.instructions) {
    messages = [
      { role: 'system', content: data.instructions },
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


export async function RunGoogle(data: Data, streamPipeline: StreamPipeline) {
  // port summarisation and title creation to gemini 2.0 flash
  // add code execution, pdf, files, and thinking
  const deepmind = new GoogleGenAI({ apiKey: API_KEYS.DEEPMIND })
  const inputMessages = data.messages.map(({ timestamp, id, ...rest }) => {
    return {
      role: rest.role,
      parts: [{ text: typeof rest.content === 'string' ? rest.content : rest.content[0].text || '' }],
    }
  });

  const response = await deepmind.models.generateContentStream({
    model: data.model,
    contents: inputMessages,
    config: {
      systemInstruction: data.instructions,
      temperature: data.temperature,
    },
  })

  for await (const chunk of response) {
    if (chunk.text) {
      streamPipeline(chunk.text, 'streaming');
    } else if (chunk.candidates?.at(-1)?.finishMessage === 'STOP') {
      streamPipeline('', 'done');
    }
  }
}
