import { GoogleGenerativeAI } from "@google/generative-ai";
import fetch from 'node-fetch';
import { API_KEYS } from "./enums/index";

type Data = {
  prompt: string;
  api: string;
  model: string;
  // instructions: string;
  temperature: number;
  stream: boolean;
}

export async function DMindAPI (data: Data) {
  const genAI = new GoogleGenerativeAI(API_KEYS.DEEPMIND);
  const model = genAI.getGenerativeModel({ model: data.model});
  const prompt = data.prompt;
  console.log('here');
  const result = await model.generateContent(prompt);
  // const response = result.response;

  console.log(result);
  return "done"
}
