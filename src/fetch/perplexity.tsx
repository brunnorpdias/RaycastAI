import fetch from 'node-fetch';
import readline from 'readline';

import { Readable } from 'stream';
import { API_KEYS } from '../enums/index';

import { type Data } from "../form";
import { type StreamPipeline } from "../answer";

type Response = {
  id: string,
  model: string,
  created: number,
  usage: {
    prompt_tokens: number,
    completion_tokens: number,
    total_tokens: number
  },
  object: string,
  choices: Array<{
    index: number,
    finish_reason: string,
    message: { role: string, content: string },
    delta: { role: string, content: string }
  }>
}


export async function PplxAPI(data: Data, streamPipeline: StreamPipeline) {
  const options = {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: `Bearer ${API_KEYS.PERPLEXITY}`
    },
    body: JSON.stringify({
      model: data.model,
      // messages: [ {role: 'system', content: 'Be precise and concise.'}, {role: 'user', content: data.prompt} ],
      messages: data.messages,
      temperature: data.temperature,
      stream: true
    })
  };

  (async () => {          // Immediately Invoked Function Expression (IIFE)
    const res = await fetch('https://api.perplexity.ai/chat/completions', options);
    if (res.body) {
      // Converts the response body to a readable stream. 'Readable.from' is a method to create a readable stream from a given input.
      const stream = Readable.from(res.body);

      // Creates a readline interface from the stream. This allows us to read the stream line by line.
      const rl = readline.createInterface({ input: stream });

      // Event listener for the 'line' event, which is triggered every time a line is read from the stream.
      rl.on('line', (line) => {
        if (line.startsWith('data: ')) {
          try {
            // Parsing the JSON from the line, assuming the line is in the format 'data: <json>', and removing 'data: ' to parse the JSON string.
            const json: Response = JSON.parse(line.replace('data: ', '').trim());

            if (json.choices[0].finish_reason === null) {
              streamPipeline(json.choices[0].delta.content, 'streaming');
            } else {
              streamPipeline(json.choices[0].delta.content, 'done');
            }

          } catch (e) {
            console.error(e);
          }
        }
      });
      // Awaiting the 'close' event of the readline interface, which signals that all lines have been processed.
      await new Promise((resolve) => rl.on('close', resolve));
    }
  })();
}
