// Navigation starts here and it's redirected to the page "answer.tsx"
import { Form, ActionPanel, Action, useNavigation, showToast } from "@raycast/api";
import Answer from './answer';
import { useState } from 'react';

type Values = {
  prompt: string;
  api: string;
  model: string;
  // instructions: string;
  temperature: string;
  stream: boolean;
};

type ParsedValues = {
  conversation: Array<{role: string, content: string}>;
  api: string;
  model: string;
  // instructions: string;
  temperature: number;
  stream: boolean;
  timestamp: number;
};

export default function Command () {
  const { push } = useNavigation();
  // change to a better name: const [query, setQuery] = useState('');
  const [selectedAPI, setSelectedAPI] = useState<string>('openai'); // default

  type API = "openai" | "deepmind" | "perplexity" | "anthropic";
  type Model = { name: string, code: string };

  const APItoModels: Record<API, Model[]> = {
    "openai": [
      {name: "GPT 4", code: "gpt-4-0125-preview"},
      {name: "GPT 3.5", code:  "gpt-3.5-turbo-1106"},
    ],
    "perplexity": [
      {name: "Llama 2 70b", code: "llama-2-70b-chat"},
      {name: "Mistral 8x7b", code: "mixtral-8x7b-instruct"},
      {name: "Perplexity Online 70b", code: "pplx-70b-online"},
      {name: "Perplexity Online 7b", code: "pplx-7b-online"},
      {name: "Llama Code 70b", code: "codellama-34b-instruct"},
      {name: "Llama Code 34b", code: "codellama-70b-instruct"},
    ],
    "deepmind": [
      {name: "Gemini Pro", code: "gemini-pro"}
    ],
    "anthropic": [
      {name: "Claude 3 Opus", code: "claude-3-opus-20240229"},
      {name: "Claude 3 Sonnet", code: "claude-3-sonnet-20240229"},
      {name: "Claude 3 Haiku", code: "claude-3-haiku-20240307"}
    ]
  }

  function handleSubmit(values: Values) {
    const parsedValues:ParsedValues = {
      conversation: [
        {role: 'user', content: values.prompt}
      ],
      api: values.api,
      model: values.model,
      temperature: parseFloat(values.temperature),
      stream: values.stream,
      timestamp: Date.now()
    }
    showToast({ title: "Submitted" });
    push(<Answer data={parsedValues} />)
  }

  // add icons to the llms
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
      <Form.TextArea id="prompt" title="Prompt" placeholder="Describe your request here" enableMarkdown={true}/>

      <Form.Dropdown
      id="api"
      title="API"
      value={selectedAPI}
      onChange={(api) => {
        setSelectedAPI(api as string);
      }}
      >
        <Form.Dropdown.Item value="openai" title="Open AI" icon="openai-logo.svg" />
        <Form.Dropdown.Item value="anthropic" title="Anthropic" icon="anthropic-icon.png" />
        <Form.Dropdown.Item value="perplexity" title="Perplexity" icon="perplexity-logo.svg" />
        <Form.Dropdown.Item value="deepmind" title="Deep Mind" icon="deepmind-logo.svg" />
      </Form.Dropdown>

      <Form.Dropdown id="model" title="Model">
        {APItoModels[selectedAPI].map((model: Model) => (
          <Form.Dropdown.Item key={model.code} value={model.code} title={model.name} />
        ))}
      </Form.Dropdown>

      <Form.Separator />
      <Form.TextField id="temperature" defaultValue="0.7" placeholder="0.7" />

      <Form.Checkbox id="stream" title="Streaming" label="Streaming or static response" defaultValue={true} />
    </Form>
  );
}
// streaming had before useEffect: 
// dynamic function for streaming option not working
