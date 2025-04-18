import { Anthropic } from '@anthropic-ai/sdk';
import { showToast, Toast } from "@raycast/api";
import * as fs from 'fs/promises';

import { API_KEYS } from '../enums/api_keys';

import { type MessageCreateParamsBase } from '@anthropic-ai/sdk/resources/messages';
import { type StreamPipeline } from "../views/answer";
import { type Data } from "../utils/types";

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
  const inputMessages = data.messages.map(({ timestamp, id, tokenCount, fileData, ...rest }) => rest);
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
        if (!['pdf'].includes(attachment.extension)) break  // only accept pdf and images
        const arrayBuffer = await fs.readFile(attachment.path);
        const pdfBase64 = Buffer.from(arrayBuffer).toString('base64');
        // attachment.data = pdfBase64;
        contentArray.push({
          type: 'document',
          source: {
            media_type: 'application/pdf',
            type: 'base64',
            data: pdfBase64,
          }
        })
        attachment.status = 'staged';
      }

      // update local instance of messages with information
      let lastMsg: Data["messages"][number] | undefined = data.messages.at(-1)
      if (lastMsg) {
        lastMsg.content = contentArray
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
      thinking_budget = 30000
      max_tokens = 62000 // max limit is now 64000 for 3.7 but restricted to avoid api overload
      break
    default:
      thinking_budget = 0
      max_tokens = 52000
      break
  }

  let request: AnthropicRequest = {
    model: data.model,
    system: data.instructions,
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
  let msgID: string = '';
  let promptTokens: number | undefined;
  let responseTokens: number | undefined;

  for await (const chunk of stream) {
    if (chunk.type === 'message_start') {
      msgID = chunk.message.id;
      promptTokens = chunk.message.usage.input_tokens;
    } else if (chunk.type === 'content_block_start' && chunk.content_block.type === 'thinking') {
      thinking_started = true
      showToast({ title: 'Thinking...', style: Toast.Style.Animated })
      streamPipeline({
        apiResponse: '### Thinking...\n```\n',
        apiStatus: 'streaming'
      })
    } else if (chunk.type === 'content_block_delta' && chunk.delta.type === 'thinking_delta') {
      thinking_text += chunk.delta.thinking;
      streamPipeline({
        apiResponse: chunk.delta.thinking,
        apiStatus: 'streaming'
      })
    } else if (chunk.type === 'content_block_start' && chunk.content_block.type === 'text') {
      if (thinking_started) {
        // streamPipeline('\n```\n\n---\n\n', 'streaming')
        streamPipeline({
          apiResponse: '',
          apiStatus: 'reset'
        })
      }
      showToast({ title: 'Streaming', style: Toast.Style.Animated })
    } else if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      streamPipeline({
        apiResponse: chunk.delta.text,
        apiStatus: 'streaming'
      })
    } else if (chunk.type === 'message_delta') {
      responseTokens = chunk.usage.output_tokens;
    } else if (chunk.type === 'message_stop') {
      streamPipeline({
        apiResponse: '',
        apiStatus: 'done',
        msgID: msgID,
        promptTokens: promptTokens,
        responseTokens: responseTokens,
      })
      data.attachments.map(attachment =>
        attachment.status === 'staged' ?
          attachment.status = 'uploaded' :
          attachment
      )
      break;
    }
  }
}
