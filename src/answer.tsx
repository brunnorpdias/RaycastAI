import { Detail, useNavigation } from "@raycast/api";
import { OpenAIn } from "./OpenAIn"

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
  const { push } = useNavigation();
  push(<OpenAIn />)
  
  return <Detail markdown={data.prompt} />;
}
