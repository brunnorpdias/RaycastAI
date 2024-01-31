import { Form, ActionPanel, Action, useNavigation, showToast } from "@raycast/api";
import Answer from './answer';
import { useState } from 'react';

type Values = {
  prompt: string;
  company: string;
  model: string;
  // instructions: string;
  temperature: string;
  stream: boolean;
};

type ParsedValues = {
  prompt: string;
  company: string;
  model: string;
  // instructions: string;
  temperature: number;
  stream: boolean;
};

export default function Command() {
  const { push } = useNavigation();
  // const [query, setQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string>('openai'); // default

  type Company = "openai" | "deepmind" | "meta" | "perplexity";
  type Model = { name: string, code: string };

  const companyToModels: Record<Company, Model[]> = {
    "openai": [
      {name: "GPT 4", code: "gpt-4-0125-preview"},
      {name: "GPT 3.5", code:  "gpt-3.5-turbo-1106"}],
    "deepmind": [
      {name: "Gemini Pro", code: "gemini-pro"}],
    "meta": [
      {name: "Llama 70b", code: "llama-70b-chat"},
      {name: "Llama 13b", code: "llama-13b-chat"},
      {name: "Llama Code 34b", code: "codellama-34b-instruct"}],
    "perplexity": [
      {name: "Online", code: "pplx-70b-online"}]
  }

    // {name: , code: },

  function handleSubmit(values: Values) {
    const parsedValues:ParsedValues = {
      ...values,
      temperature: parseFloat(values.temperature),
    }
    // console.log(parsedValues)
    showToast({ title: "Submitted" });
    push(<Answer data={parsedValues} />)
  }

  // add icons to the llms
  // add option to filter the models by using the llm

  // <Action title="Push" onAction={() => handleSubmit(values)} />
  // <Form.Dropdown.Item value="anthropic" title="Anthropic" />

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

      <Form.Dropdown
      id="company"
      title="Company"
      value={selectedCompany}
      onChange={(company) => {
        setSelectedCompany(company as string);
      }}
      >
        <Form.Dropdown.Item value="openai" title="Open AI" />
        <Form.Dropdown.Item value="deepmind" title="Deep Mind" />
        <Form.Dropdown.Item value="meta" title="Meta" />
        <Form.Dropdown.Item value="perplexity" title="Perplexity" />
      </Form.Dropdown>

      <Form.Dropdown id="model" title="Model">
        {companyToModels[selectedCompany].map((model: Model) => (
          <Form.Dropdown.Item key={model.code} value={model.code} title={model.name} />
        ))}
      </Form.Dropdown>

      <Form.Separator />
      <Form.TextField id="temperature" defaultValue="0.7" placeholder="0.7" />

      <Form.Checkbox id="stream" title="Streaming" label="Streaming or static response" defaultValue={true} />
    </Form>
  );
}
