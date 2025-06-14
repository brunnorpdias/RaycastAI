import { Anthropic } from '@anthropic-ai/sdk';
import { showToast, Toast } from "@raycast/api";
import fs from 'fs';
import path from 'path';

import { API_KEYS } from '../enums/api_keys';

import { type MessageCreateParamsBase } from '@anthropic-ai/sdk/resources/messages';
import { type StreamPipeline } from "../views/answer";
import { type Data, storageDir } from "../utils/types";
import assert from 'assert';

type AnthropicRequest = {
  model: string,
  system: string | undefined,
  messages: Messages,
  max_tokens: number,
  temperature: number,
  stream?: boolean,
  thinking?: {
    type: string,
    budget_tokens: number,
  },
}

type Messages = Array<{
  role: 'user' | 'assistant',
  content: Content,
}>

type Content = string | Array<{
  type: 'text' | 'document' | 'image',
  text?: string,
  source?: {
    type: 'url' | 'base64',
    media_type?: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
    data?: string,
    url?: string,
  },
  cache_control?: { type: 'ephemeral' | '' }
}>


const client = new Anthropic({ apiKey: API_KEYS.ANTHROPIC });

export async function AnthropicAPI(data: Data, streamPipeline: StreamPipeline) {
  // console.log('start', data.files)
  let max_tokens: number;
  let thinking_budget: number;
  const messages = data.messages.map(({ id, tokenCount, ...rest }) => rest);
  const timestamps = data.files.map(file => file.timestamp);
  let inputMessages: (Messages[number] & { timestamp?: number })[];

  // 5mb image limit; 32mb pdf and 100 pages
  if (data.model === 'claude-3-7-sonnet-latest' && data.files?.length > 0) {
    inputMessages = messages.map(msg => {
      if (timestamps.includes(msg.timestamp)) {
        return {
          ...msg,
          content: [{
            type: 'text',
            text: msg.content
          }],
        }
      } else {
        return {
          ...msg
        }
      }
    })

    for (const file of data.files) {
      const filePath = path.join(storageDir, `${file.hash}.${file.extension}`);
      const arrayBuffer = fs.readFileSync(filePath);
      assert(arrayBuffer !== undefined, 'File not found')
      const base64: string | undefined = arrayBuffer.toString('base64');
      let inputMessage = inputMessages.find(msg => msg.timestamp === file.timestamp);
      assert(['pdf'].includes(file.extension), `File type ${file.extension} not supported`);
      assert(Array.isArray(inputMessage?.content), 'Content was not converted to an array')
      // console.log('string', base64)
      inputMessage?.content.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: base64,
        }
      })
      file.status = 'staged';
    }
  } else {
    inputMessages = messages;
  }
  inputMessages = inputMessages.map(({ timestamp, ...msg }) => msg)  // remove timestamp attribute

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
    messages: inputMessages,
    max_tokens: max_tokens,
    temperature: 1,
    stream: true,
    // tools: web search
    // https://docs.anthropic.com/en/docs/build-with-claude/tool-use/web-search-tool
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
      data.files.map(file =>
        file.status === 'staged' ?
          file.status = 'uploaded' :
          file
      )
      break;
    }
  }
}
