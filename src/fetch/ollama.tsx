import ollama from 'ollama';

import { Data } from '../utils/types';
import { type StreamPipeline } from "../views/answer";

// remove optionals later
export async function Run(data: Data, streamPipeline: StreamPipeline) {
  const messages = data?.messages.map(({ role, content }) => {
    return {
      role: role,
      content: content
    }
  })

  const response = await ollama.chat({
    model: data?.model ?? 'gemma3:12b',
    messages: messages ?? [{ role: 'user', content: 'This is a test' }],
    stream: true
    // set thinking budget for specific models
  })

  for await (const event of response) {
    if (event.message.content === '<think>') {
      streamPipeline({ apiResponse: '## Thinking mode\n', apiStatus: 'streaming' })
    } else if (event.message.content === '</think>') {
      streamPipeline({ apiResponse: '', apiStatus: 'reset' })
    } else if (!event.done) {
      streamPipeline({ apiResponse: event.message.content, apiStatus: 'streaming' })
    } else {
      streamPipeline({ apiResponse: '', apiStatus: 'done' })
    }
  }
}
