import { Anthropic } from '@anthropic-ai/sdk';
import { MessageStreamEvent } from '@anthropic-ai/sdk/resources';
import { Message } from '@anthropic-ai/sdk/resources';
import { API_KEYS } from '../enums';

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

export async function AnthropicAPI(data: Data, onResponse: (response: string, status: string) => void) {
  const messages = data.conversation.map(({ timestamp, ...rest }) => rest);
  const client = new Anthropic({ apiKey: API_KEYS.ANTHROPIC });

  const msg = await client.messages.create({
    model: data.model,
    system: data.systemMessage,
    messages: messages,
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
