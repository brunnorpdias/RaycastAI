import { Detail } from "@raycast/api";
// import { OpenAIn } from '../requests/openAI'
import { gptStatic } from './openAI'
import { useEffect, useState } from 'react';

type Data = {
  prompt: string;
  // llm: string;
  model: string;
  // instructions: string;
  temperature: number;
  streaming: boolean;
};

// export default function Command(prompt, model, temperature, streaming) {
export default function Command({ data }: { data: Data }) {

  const [text, setText] = useState("");
  // add a feedback that the message is over and the time it took to complete
  useEffect(() => {
    gptStatic(data).then((response: string | null) => {
      console.log(response);
      setText(response as string);
    });
  }, [data]);

  return <Detail markdown={text} />;
}
