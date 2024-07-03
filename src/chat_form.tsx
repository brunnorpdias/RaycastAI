// Navigation starts here and it's redirected to the page 'answer.tsx'
import { Form, ActionPanel, Action, useNavigation, Cache } from '@raycast/api';
import Answer from './chat_answer';
// import Bookmarks from './chat_bookmarks';
import Detail from './chat_bookmarkDetail'
import instructions from '../instructions.json';
import { useState } from 'react';

type Values = {
  prompt: string;
  api: string;
  model: string;
  temperature: string;
  stream: boolean;
};

type ParsedValues = {
  conversation: Array<{ role: 'user' | 'assistant' | 'system', content: string }>;
  api: string;
  model: string;
  temperature: number;
  stream: boolean;
  timestamp: number;
};

export default function Command() {
  const { push } = useNavigation();
  // change to a better name: const [query, setQuery] = useState('');
  const [selectedAPI, setSelectedAPI] = useState<API>('groq'); // default

  type API = 'openai' | 'perplexity' | 'anthropic' | 'groq';
  type Model = { name: string, code: string };

  const APItoModels: Record<API, Model[]> = {
    'groq': [
      { name: 'LLaMA3 70b', code: 'llama3-70b-8192' },
      { name: 'LLaMA3 8b', code: 'llama3-8b-8192' },
    ],
    'openai': [
      { name: 'GPT 4o', code: 'gpt-4o' },
      // { name: 'GPT 3.5', code: 'gpt-3.5-turbo' },
    ],
    'anthropic': [
      { name: 'Claude 3.5 Sonnet', code: 'claude-3-5-sonnet-20240620' },
      { name: 'Claude 3 Haiku', code: 'claude-3-haiku-20240307' },
      { name: 'Claude 3 Sonnet', code: 'claude-3-sonnet-20240229' },
      { name: 'Claude 3 Opus', code: 'claude-3-opus-20240229' },
    ],
    'perplexity': [
      { name: 'Sonar Large Online', code: 'llama-3-sonar-large-32k-online' },
      { name: 'Llama 3 8b', code: 'llama-3-8b-instruct' },
      { name: 'Llama 3 70b', code: 'llama-3-70b-instruct' },
    ],
  }

  function handleSubmit(values: Values) {
    const parsedValues: ParsedValues = {
      conversation: [
        { role: 'system', content: instructions.text },
        { role: 'user', content: values.prompt }
      ],
      api: values.api,
      model: values.model,
      temperature: 0.7,
      stream: values.stream,
      timestamp: Date.now(),
    }
    // showToast({ title: 'Submitted' });
    push(<Answer data={parsedValues} />)
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title='Submit' onSubmit={handleSubmit} />
          <Action
            title='Cache'
            onAction={async () => {
              const cache = new Cache();
              const cached = cache.get("lastConversation");
              if (cached) {
                const cachedData: ParsedValues = JSON.parse(cached);
                push(<Detail data={cachedData} />)
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id='prompt' title='Prompt' placeholder='Describe your request here' enableMarkdown={true} />

      <Form.Dropdown
        id='api'
        title='API'
        value={selectedAPI}
        onChange={(api) => {
          setSelectedAPI(api as API);
        }}
      >
        <Form.Dropdown.Item value='groq' title='Groq' icon='groq-icon.png' />
        <Form.Dropdown.Item value='openai' title='Open AI' icon='openai-logo.svg' />
        <Form.Dropdown.Item value='anthropic' title='Anthropic' icon='anthropic-icon.png' />
        <Form.Dropdown.Item value='perplexity' title='Perplexity' icon='perplexity-icon.png' />
      </Form.Dropdown>

      <Form.Dropdown id='model' title='Model'>
        {APItoModels[selectedAPI].map((model: Model) => (
          <Form.Dropdown.Item key={model.code} value={model.code} title={model.name} />
        ))}
      </Form.Dropdown>

      <Form.Checkbox id='stream' title='Streaming' label='Streaming or static response' defaultValue={true} />
    </Form>
  );
}
// streaming had before useEffect: 
// dynamic function for streaming option not working
