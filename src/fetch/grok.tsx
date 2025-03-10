import OpenAI from "openai";
import { ChatCompletionChunk, ChatCompletion } from "openai/resources";
import { API_KEYS } from '../enums';
import { showToast, Toast } from "@raycast/api";

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

export async function RunChat(data: Data, onResponse: (response: string, status: string) => void) {
  const client = new OpenAI({
    apiKey: API_KEYS.GROK,
    baseURL: "https://api.x.ai/v1",
  });

  const completion = await client.chat.completions.create({
    model: "grok-2-latest",
    messages: data.conversation,
    stream: data.stream,
    temperature: data.temperature,
  });
  // console.log(completion.choices[0].message);


  let streaming = false;
  if (data.stream) {
    const stream = completion as AsyncIterable<ChatCompletionChunk>;
    for await (const chunk of stream) {
      // console.log(JSON.stringify(chunk));
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
