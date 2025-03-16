import { showToast, Toast } from "@raycast/api";
import OpenAI from "openai";
import { ChatCompletionChunk, ChatCompletion } from "openai/resources";
import { API_KEYS } from '../enums';
import { type Data } from "../chat_form";


const openai = new OpenAI({
  apiKey: API_KEYS.DEEPMIND,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

export async function RunChat(data: Data, onResponse: (response: string, status: string) => void) {
  const conversation = data.messages.map(({ timestamp, ...msg }) => (
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

