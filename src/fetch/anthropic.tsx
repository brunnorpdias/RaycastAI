import { Anthropic } from '@anthropic-ai/sdk';
import { MessageStreamEvent } from '@anthropic-ai/sdk/resources';
import { showToast, Toast } from "@raycast/api";
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
  reasoning: 'low' | 'medium' | 'high';
};


export async function AnthropicAPI(data: Data, onResponse: (response: string, status: string) => void) {
  const client = new Anthropic({ apiKey: API_KEYS.ANTHROPIC });
  const messages = data.conversation.map(({ timestamp, ...rest }) => rest);
  let thinking_budget: number;
  let max_tokens: number;

  switch (data.reasoning) {
    case 'low':
      thinking_budget = 0
      max_tokens = 8192
      break;
    case 'medium':
      thinking_budget = 16000
      max_tokens = 27904
      break
    case 'high':
      thinking_budget = 32000
      max_tokens = 64000
      break
  }

  let request = {
    model: data.model,
    system: data.systemMessage,
    messages: messages,
    max_tokens: max_tokens,
    temperature: data.temperature,
    stream: data.stream,
  }

  if (data.model == 'claude-3-7-sonnet-latest' && data.reasoning != 'low') {
    request.thinking = {
      type: "enabled",
      budget_tokens: thinking_budget,
    }
  }

  const response = await client.messages.create(request)
  showToast({ title: 'Request sent', style: Toast.Style.Success })

  let thinking_started = false;
  let stream_started = false;

  if (data.stream == true) {
    const stream = response as AsyncIterable<MessageStreamEvent>;
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_start') {
        console.log(`\nStarting ${chunk.content_block.type} block...`);
      } else if (chunk.type === 'content_block_delta') {
        if (chunk.delta.type === 'thinking_delta') {
          // console.log(`Thinking: ${chunk.delta.thinking}`);
          if (!thinking_started) {
            showToast({ title: 'Thinking...', style: Toast.Style.Animated })
            thinking_started = true;
          }
        } else if (chunk.delta.type === 'text_delta') {
          onResponse(chunk.delta.text, 'streaming');
          if (!stream_started) {
            showToast({ title: 'Streaming Text', style: Toast.Style.Animated })
            stream_started = true;
          }
        }
      } else if (chunk.type === 'content_block_stop') {
        onResponse('', 'done');
        break;
      }
    }
  } else {
    // const text: string | undefined = msg.content[0].text
    const message = response as Message;
    onResponse(message.content[0].text, 'done');
  }
}
