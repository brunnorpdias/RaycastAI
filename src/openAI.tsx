import OpenAI from "openai";
import { API_KEYS } from './enums';

type Data = {
  conversation: Array<{role: string, content: string}>;
  api: string;
  model: string;
  // instructions: string;
  temperature: number;
  stream: boolean;
};

// define type of completion to eliminate type problem

// change name to streaming and copy the static version as well (don't forget to change it in answer.tsx)
export async function OpenAPI (data: Data, onResponse: (response: string, status: string) => void) {
  const openai = new OpenAI(
      {apiKey: API_KEYS.OPENAI}
  );

  const completion = await openai.chat.completions.create({
    model: data.model,
    messages: data.conversation,
    // [
    //   { role: "system", content: "You are a helpful assistant." },
    //   { role: "user", content: data.conversation[0].content },
    // ],
    temperature: data.temperature,
    stream: data.stream,
  });

  if (data.stream) {
    for await (const chunk of completion) {
      if (typeof chunk.choices[0].delta.content === "string") {
        onResponse(chunk.choices[0].delta.content, "streaming");
      };
      if (chunk.choices[0].finish_reason == 'stop') {
        // console.log('Stopping stream');
        onResponse('', 'done');
        break;
      };
    }
  } else {
    onResponse(completion.choices[0].message.content, 'done');
  }
}
