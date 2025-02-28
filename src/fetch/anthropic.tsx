import { Anthropic } from '@anthropic-ai/sdk';
import { MessageStreamEvent } from '@anthropic-ai/sdk/resources';
import { Message } from '@anthropic-ai/sdk/resources';
import { API_KEYS } from '../enums';


type Data = {
  id: number;
  temperature: number;
  conversation: Array<{
    role: 'user' | 'assistant',
    content: string | Array<{
      type: 'text' | 'document' | 'image',
      source?: object,
      text?: string
    }>,
    timestamp?: number
  }>;
  model: string;
  api?: string;
  systemMessage?: string;
  instructions?: string;
  stream?: boolean;
  assistantID?: string;
  threadID?: string;
  runID?: string;
  attachmentsDir: [string];
};


export async function AnthropicAPI(data: Data, onResponse: (response: string, status: string) => void) {
  const messages = data.conversation.map(({ timestamp, ...rest }) => rest);
  const client = new Anthropic({ apiKey: API_KEYS.ANTHROPIC });

  const response = await client.messages.create({
    model: data.model,
    system: data.systemMessage,
    messages: messages,
    max_tokens: 4096,
    temperature: data.temperature,
    stream: data.stream,
  })

  if (data.stream == true) {
    const streamMsg = response as AsyncIterable<MessageStreamEvent>;
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
    const message = response as Message;
    onResponse(message.content[0].text, 'done');
  }
}
