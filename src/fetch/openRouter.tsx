import { type Data } from "../utils/types";
import { type StreamPipeline } from "../views/answer";

import { API_KEYS } from '../enums/api_keys';
import { showToast, Toast } from "@raycast/api";

export async function OpenRouter(data: Data, streamPipeline: StreamPipeline) {
  const url = 'https://openrouter.ai/api/v1/chat/completions';
  const messages = data.messages.map(({ id, timestamp, tokenCount, ...msg }) => msg);
  const options = {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEYS.OPENROUTER}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      "model": data.model,
      "messages": messages,
      "stream": true,
    })
  };

  // try {
  //   const response = await fetch(url, options);
  //   const data = await response.json();
  //   console.log(JSON.stringify(data));
  // } catch (error) {
  //   console.error(error);
  // }

  const response = await fetch(url, options);
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  let isStreaming: boolean = false;
  const decoder = new TextDecoder();
  let buffer = '';

  // improve this function
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      // Append new chunk to buffer
      buffer += decoder.decode(value, { stream: true });
      // Process complete lines from buffer
      while (true) {
        const lineEnd = buffer.indexOf('\n');
        if (lineEnd === -1) break;
        const line = buffer.slice(0, lineEnd).trim();
        buffer = buffer.slice(lineEnd + 1);
        if (line.startsWith('data: ')) {
          if (!isStreaming) {
            showToast({ title: 'Streaming', style: Toast.Style.Animated })
            isStreaming = true
          }
          const dataString = line.slice(6);
          if (dataString === '[DONE]') {
            streamPipeline({
              apiResponse: '',
              apiStatus: 'done'
            });
            break;
          }
          try {
            const parsed = JSON.parse(dataString);
            const content = parsed.choices[0].delta.content;
            streamPipeline({
              apiResponse: content,
              apiStatus: 'streaming'
            });
          } catch (e) {
            showToast({ title: 'Invalid JSON', style: Toast.Style.Failure })
            console.log('Invalid JSON')
          }
        }
      }
    }
  } finally {
    reader.cancel();
  }
}
