import AnthropicAPI from '@anthropic-ai/sdk';
import { API_KEYS } from './enums';

type Data = {
  conversation: Array<{ role: 'user' | 'assistant', content: string }>;
  api: string;
  model: string;
  // instructions: string;
  temperature: number;
  stream: boolean;
  timestamp: number;
};

export async function Anthropic (data: Data, onResponse: (response: string, status: string) => void) {
  const client = new AnthropicAPI({
    apiKey: API_KEYS.ANTHROPIC,
  });

  // const msg = await client.messages.create({
  //   model: data.model,
  //   max_tokens: 1024,
  //   temperature: data.temperature,
  //   messages: data.conversation
  // });

  const msg = await client.messages.create({
    // messages: data.conversation,
    messages: data.conversation,
    model: data.model,
    max_tokens: 1024,
    temperature: data.temperature,
    stream: data.stream,
  })

  if (data.stream == true) {
    for await (const chunk of msg) {
      // console.log(chunk);
      if (chunk.type === 'content_block_delta') {
        onResponse(chunk.delta.text, 'streaming');
      }
      if (chunk.type === 'content_block_stop') {
        onResponse('', 'done');
      }
    }
  } else {
    // const text: string | undefined = msg.content[0].text
    onResponse(msg.content[0].text, 'done');
  }
}
