import OpenAI from "openai";

type Data = {
  prompt: string;
  // llm: string;
  model: string;
  // instructions: string;
  temperature: number;
  streaming: boolean;
};

export async function gptStatic( data: Data ) {
  // console.log(data)

  const openai = new OpenAI(
      {apiKey: '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'}
  );

  const completion = await openai.chat.completions.create({
    model: data.model,
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: data.prompt },
    ],
    temperature: data.temperature,
  });

  return completion.choices[0].message.content;;
}
