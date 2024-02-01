import OpenAI from "openai";
import { API_KEYS } from './enums';

type Data = {
  prompt: string;
  company: string;
  model: string;
  // instructions: string;
  temperature: number;
  stream: boolean;
};

// change name to streaming and copy the static version as well (don't forget to change it in answer.tsx)
export async function gptStatic( 
  data: Data,
  onResponse: (response: string, status: string) => void
) {
  
  const openai = new OpenAI(
      {apiKey: API_KEYS.OPENAI_KEY}
  );

  const completion = await openai.chat.completions.create({
    model: data.model,
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: data.prompt },
    ],
    temperature: data.temperature,
    stream: true,
  });

  for await (const chunk of completion) {
    if (typeof chunk.choices[0].delta.content === "string") {
      // console.log(chunk.choices[0].delta.content);
      onResponse(chunk.choices[0].delta.content, "streaming");
    };

    if (chunk.choices[0].finish_reason == 'stop') {
      // console.log('Stopping stream');
      onResponse('', 'done');
      break;
    };
  };
  // return completion.choices[0].message.content;;
}
