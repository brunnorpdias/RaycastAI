import AnthropicAPI from '@anthropic-ai/sdk';
import { MessageStreamEvent } from '@anthropic-ai/sdk/resources';
import { Message } from '@anthropic-ai/sdk/resources';
import { API_KEYS } from './enums';

type DataAnthropic = {
  conversation: Array<{ role: 'user' | 'assistant', content: string }>;
  api: string;
  model: string;
  temperature: number;
  stream: boolean;
  timestamp: number;
};

export async function Anthropic(data: DataAnthropic, onResponse: (response: string, status: string) => void) {
  const client = new AnthropicAPI({
    apiKey: API_KEYS.ANTHROPIC,
  });

  const msg = await client.messages.create({
    messages: data.conversation,
    model: data.model,
    max_tokens: 4096,
    temperature: data.temperature,
    stream: data.stream,
  })

  if (data.stream == true) {
    const streamMsg = msg as AsyncIterable<MessageStreamEvent>;
    for await (const chunk of streamMsg) {
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
    const message = msg as Message;
    onResponse(message.content[0].text, 'done');
  }
}
