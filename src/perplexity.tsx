import { API_KEYS } from './enums';
import fetch from 'node-fetch';
import fs from 'fs';

type Data = {
  conversation: Array<{role: string, content: string}>;
  api: string;
  model: string;
  // instructions: string;
  temperature: number;
  stream: boolean;
};

export async function PplxAPI(
  { data }: { data: Data },
  onResponse: (response: string, status: string) => void
) {
  const options = {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: `Bearer ${API_KEYS.PERPLEXITY}`
    },
    body: JSON.stringify({
      model: data.model,
      // messages: [
      //   {role: 'system', content: 'Be precise and concise.'},
      //   {role: 'user', content: data.prompt}
      // ],
      messages: data.conversation,
      temperature: data.temperature,
      stream: data.stream
    })
  };
  
  const response = await fetch('https://api.perplexity.ai/chat/completions', options);
  if (data.stream) {
    // Ensure response.body exists and is not null
    if (response.body) {
      // Using the async iterator to read chunks from the stream
      const reader = response.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          // Assuming value is a Uint8Array, you might need to convert it
          // depending on your requirements. For text, you can use TextDecoder.
          console.log(new TextDecoder().decode(value));
        }
      } catch (e) {
        console.error('Stream reading failed:', e);
      } finally {
        reader.releaseLock();
      }
    }
  } else {
    console.log('here');
    console.log(response);
    const message = response.choices[0].message.content;
    console.log(message)
    onResponse(message, 'done');
  }




  // if (data.stream) {
  //   for await (const chunk of response) {
  //     console.log(chunk);
  //   }
  // }

  // fetch('https://api.perplexity.ai/chat/completions', options)
  // .then(res => res.text())
  // .then(text => text.substring(text.indexOf('{'), text.lastIndexOf('}')))
  // .then(jsonString => {
  //   console.log(jsonString);
  //   return jsonString;
  // })
  // .then(jsonString => JSON.parse(jsonString))
  // .then(json => console.log(json.choices))

  //  const response = apiResponse.text();
  //  console.log(response);
  //  const jsonString = response.substring(response.indexOf("{"));

  //  // Parse the JSON string to an object
  //  const jsonObject = JSON.parse(jsonString);

  //  console.log(jsonObject)
  //  })
  // fetch('https://api.perplexity.ai/chat/completions', options)
  // .then(res => res.json())
  // .then(json => console.log(json))
  // .catch(err => console.error('error:' + err));

  //     if (data.stream) {
  //       // for (const chunk of response) {
  //       //   console.log(chunk);
  //       // };
  //     } else {
  //       const message = response.choices[0].message.content;
  //       console.log(message)
  //       onResponse(message, 'done');
  //     }
}
