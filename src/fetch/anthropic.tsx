import { Anthropic } from '@anthropic-ai/sdk';
import { type MessageCreateParamsBase } from '@anthropic-ai/sdk/resources/messages';
import { showToast, Toast } from "@raycast/api";
import { API_KEYS } from '../enums';
import * as fs from 'fs/promises';

import { type StreamPipeline } from "../answer";
import { type Data } from "../form";

type Content = Data["messages"][0]["content"]

type AnthropicRequest = {
  model: string,
  system: string | undefined,
  messages: object,
  max_tokens: number,
  temperature: number,
  stream?: boolean,
  thinking?: {
    type: string,
    budget_tokens: number,
  },
}


export async function AnthropicAPI(data: Data, streamPipeline: StreamPipeline) {
  const client = new Anthropic({ apiKey: API_KEYS.ANTHROPIC });
  let max_tokens: number;
  let thinking_budget: number;
  const inputMessages = data.messages.map(({ id, ...rest }) => rest);
  let messages;

  if (data.model === 'claude-3-7-sonnet-latest' && data.attachments && data.attachments.length > 0) {
    if (inputMessages.length === 1 && typeof inputMessages[0].content == 'string') {
      let contentArray: Content = [
        {
          type: 'text',
          text: inputMessages[0].content,
        },
      ];

      const attachmentsQueue = data.attachments.filter(({ status }) => status !== 'uploaded')
      for (const attachment of attachmentsQueue) {
        const arrayBuffer = await fs.readFile(attachment.path);
        const pdfBase64 = Buffer.from(arrayBuffer).toString('base64');
        contentArray.push({
          type: 'document',
          source: {
            media_type: 'application/pdf',
            type: 'base64',
            data: pdfBase64,
          }
        })
        attachment.status = 'uploaded';
      }

      messages = [{
        role: 'user',
        content: contentArray,
      }]
    } else {
      messages = inputMessages;
      // add logic for additional pdf's and images when chat_newentry makes it possible (also, need to differentiate new files)
    }
  } else {
    messages = inputMessages;
  }

  switch (data.reasoning) {
    case 'low':
      thinking_budget = 8000
      max_tokens = 16000
      break;
    case 'medium':
      thinking_budget = 20000
      max_tokens = 40000
      break
    case 'high':
      thinking_budget = 32000
      max_tokens = 62000 // max limit is now 64000 for 3.7 but restricted to avoid api overload
      break
    default:
      thinking_budget = 0
      max_tokens = 52000
      break
  }

  let request: AnthropicRequest = {
    model: data.model,
    system: data.systemMessage,
    messages: messages,
    max_tokens: max_tokens,
    temperature: data.temperature,
    stream: true,
  }

  if (data.model === 'claude-3-7-sonnet-latest' && data.reasoning && ['low', 'medium', 'high'].includes(data.reasoning)) {
    request.thinking = {
      type: "enabled",
      budget_tokens: thinking_budget,
    }
  } else if (data.model === 'claude-3-5-haiku-latest') {
    request.max_tokens = 8100 // limit is 8182
  }

  let thinking_started = false;
  const stream = client.messages.stream(request as MessageCreateParamsBase)
  let thinking_text = '';  // collect on data later on? cannot be at message to avoid feeding back to the model
  let msgID: number = 0;
  for await (const chunk of stream) {
    if (chunk.type === 'message_start') {
      msgID = Number(chunk.message.id);
    } else if (chunk.type === 'content_block_start' && chunk.content_block.type === 'thinking') {
      thinking_started = true
      showToast({ title: 'Thinking...', style: Toast.Style.Animated })
      streamPipeline('### Thinking...\n```\n', 'streaming')
    } else if (chunk.type === 'content_block_delta' && chunk.delta.type === 'thinking_delta') {
      thinking_text += chunk.delta.thinking;
      streamPipeline(chunk.delta.thinking, 'streaming')
    } else if (chunk.type === 'content_block_start' && chunk.content_block.type === 'text') {
      if (thinking_started) {
        streamPipeline('\n```\n\n---\n\n', 'streaming')
        streamPipeline('', 'reset')
      }
      showToast({ title: 'Streaming', style: Toast.Style.Animated })
    } else if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      streamPipeline(chunk.delta.text, 'streaming')
    } else if (chunk.type === 'message_stop') {
      streamPipeline('', 'done', msgID)
      break;
    }
  }
}
