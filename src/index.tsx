import { Form, ActionPanel, Action, useNavigation, showToast } from "@raycast/api";
import Answer from './answer';

type Values = {
  prompt: string;
  // llm: string;
  model: string;
  // instructions: string;
  temperature: string;
  streaming: boolean;
};

type ParsedValues = {
  prompt: string;
  // llm: string;
  model: string;
  // instructions: string;
  temperature: number;
  streaming: boolean;
};

export default function Command() {
  const { push } = useNavigation();

  function handleSubmit(values: Values) {
    const parsedValues:ParsedValues = {
      ...values,
      temperature: parseFloat(values.temperature) 
    }
    console.log(parsedValues)
    showToast({ title: "Submitted form", message: "See logs for submitted values" });
    push(<Answer data={parsedValues} />)
  }

  // add icons to the llms
  // add option to filter the models by using the llm

  // <Form.Dropdown id="organization" title="Organization" >
  //   <Form.Dropdown.Item value="openai" title="Open AI (offline)" />
  //   <Form.Dropdown.Item value="deepmind" title="Gemini (offline)" />
  //   <Form.Dropdown.Item value="perplexity" title="Perplexity (offline)" />
  //   <Form.Dropdown.Item value="anthropic" title="Anthropic (offline)" />
  // </Form.Dropdown>
  
  // <Action title="Push" onAction={() => handleSubmit(values)} />

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      // enableDrafts={true}
    >
      <Form.TextArea id="prompt" title="Prompt" placeholder="Describe your request here" />
      <Form.Dropdown id="model" title="Model" defaultValue="gpt-3.5-turbo-1106">
          <Form.Dropdown.Item value="gpt-4-0125-preview" title="GPT 4 (off)" keywords={["openai"]} />
        <Form.Dropdown.Item value="gpt-3.5-turbo-1106" title="GPT 3.5 (off)" keywords={["openai"]} />
        <Form.Dropdown.Item value="gemini-pro" title="Gemini (off)" keywords={["google", "deepmind"]} />
        <Form.Dropdown.Item value="llama-70b-chat" title="Llama 70b (off)" keywords={["meta"]} />
        <Form.Dropdown.Item value="llama-13b-chat" title="Llama 13b (off)" keywords={["meta"]} />
        <Form.Dropdown.Item value="codellama-34b-instruct" title="Llama Code 34b (off)" keywords={["meta"]} />
        <Form.Dropdown.Item value="pplx-70b-online" title="Perplexity (off)" keywords={["online", "perplexity"]} />
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextField id="temperature" defaultValue="0.7" placeholder="0.7" />
      <Form.Checkbox id="stream" title="Streaming" label="Streaming or static response" defaultValue={true} />
    </Form>
  );
}
