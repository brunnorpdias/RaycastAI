import { GoogleGenerativeAI } from "@google/generative-ai";
import { API_KEYS } from "./enums/index";

type Data = {
  conversation: Array<{role: string, content: string}>;
  api: string;
  model: string;
  // instructions: string;
  temperature: number;
  stream: boolean;
  timestamp: number;
};

// https://ai.google.dev/tutorials/web_quickstart#multi-turn-conversations-chat
export async function DMindAPI (data: Data, onResponse: (response: string, status: string) => void) {
  const genAI = new GoogleGenerativeAI(API_KEYS.DEEPMIND);
  const model = genAI.getGenerativeModel({ model: data.model });
  const prompt = data.conversation[data.conversation.length - 1].content;
  // const chat = model.startChat({ history: data.conversation })
  for (let i = 0; i < data.conversation.length; i++) {
    console.log(data.conversation[i]);
  }
    
  // .slice(0, data.conversation.length - 1)

  // Stream doesn't work yet, solve type issue and conversation mode for both, first the static api call
  if (data.stream) {
    const result = await model.generateContentStream(prompt);
    // const result = await chat.sendMessageStream(
    console.log('2');
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      console.log(chunkText);
    }
  } else {
    const result = await model.generateContent(prompt);
    const response = result.response;
    // console.log(response.candidates[0].content.parts[0].text);
    if (typeof response.candidates[0].content.parts[0].text == 'string') {
      onResponse(response.candidates[0].content.parts[0].text, 'done');
    } else {
      console.log('No response from server')
    }
  }
}
