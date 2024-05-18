import { GoogleGenerativeAI } from "@google/generative-ai";
import { API_KEYS } from "./enums/index";

type Data = {
  conversation: Array<{ role: 'user' | 'assistant', content: string }>;
  api: string;
  model: string;
  // instructions: string;
  temperature: number;
  stream: boolean;
  timestamp: number;
};

// type Data = {
//   conversation: Array<{ role: string, content: string }>;
//   api: string;
//   model: string;
//   // instructions: string;
//   temperature: number;
//   stream: boolean;
//   timestamp: number;
// };

const genAI = new GoogleGenerativeAI(API_KEYS.DEEPMIND);

// https://ai.google.dev/tutorials/web_quickstart#multi-turn-conversations-chat
export async function DMindAPI(data: Data, onResponse: (response: string, status: string) => void) {
  const model = genAI.getGenerativeModel({ model: data.model });
  const prompt = data.conversation[data.conversation.length - 1].content;

  const history = []
  if (data.conversation.length > 0) {
    for (let i = 0; i < data.conversation.length; i++) {
      if (i % 2 == 0) {
        history.push({ role: "user", parts: [{ text: data.conversation[i].content }] });
      } else {
        history.push({ role: "model", parts: [{ text: data.conversation[i].content }] })
      }
    }
  }

  const chat = model.startChat({
    history: [
      {
        role: "user",
        parts: [{ text: "Hello, I have 2 dogs in my house." }],
      },
    ],
    generationConfig: {
      maxOutputTokens: 100,
    },
  });
  // const chat = model.startChat({ history: data.conversation })

  // Stream doesn't work yet, solve type issue and conversation mode for both, first the static api call
  if (data.stream) {
    const result = await chat.sendMessageStream(prompt);
    console.log('2');
    // const result = await chat.sendMessageStream(
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      console.log(chunkText);
    }
  } else {
    const result = await model.generateContent(prompt);
    const response = result.response;
    if (response.candidates) {
      if (typeof response.candidates[0].content.parts[0].text == 'string') {
        onResponse(response.candidates[0].content.parts[0].text, 'done');
      } else {
        console.log('No response from server')
      }
    }
  }
}
