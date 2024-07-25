import { Form, ActionPanel, Action, useNavigation } from '@raycast/api';
import Answer from './chat_answer';
import instructions from '../instructions.json';
import { useState } from 'react';

type Values = {
  prompt: string;
  api: string;
  model: string;
  temperature: string;
  stream: boolean;
};

// type ParsedValues = {
//   model: string;
//   api: string;
//   systemMessage: string;
//   conversation: Array<{ role: 'user' | 'assistant', content: string, timestamp: number }>;
//   temperature: number;
//   stream: boolean;
//   timestamp: number;
// };

type ParsedValues = {
  id: number;
  temperature: number;
  conversation: Array<{ role: 'user' | 'assistant', content: string, timestamp: number }>;
  model: string;
  api?: string;
  systemMessage?: string;
  instructions?: string;
  stream?: boolean;
  assistantID?: string;
  threadID?: string;
  runID?: string;
  attachments?: Array<{ file_id: string, tools: Array<{ type: 'code_interpreter' | 'file_search' }> }>;
};


export default function ChatForm() {
  const { push } = useNavigation();
  // change to a better name: const [query, setQuery] = useState('');
  const [selectedAPI, setSelectedAPI] = useState<API>('openai'); // default

  type API = 'openai' | 'perplexity' | 'anthropic' | 'groq';
  type Model = { name: string, code: string };

  const APItoModels: Record<API, Model[]> = {
    'openai': [
      { name: 'GPT 4o Mini', code: 'gpt-4o-mini' },
      { name: 'GPT 4o', code: 'gpt-4o' },
      // { name: 'GPT 3.5', code: 'gpt-3.5-turbo' },
    ],
    'anthropic': [
      { name: 'Claude 3.5 Sonnet', code: 'claude-3-5-sonnet-20240620' },
      { name: 'Claude 3 Haiku', code: 'claude-3-haiku-20240307' },
      { name: 'Claude 3 Sonnet', code: 'claude-3-sonnet-20240229' },
      { name: 'Claude 3 Opus', code: 'claude-3-opus-20240229' },
    ],
    'groq': [
      { name: 'LLaMA 8b', code: 'llama-3.1-8b-instant' },
      { name: 'LLaMA 70b', code: 'llama-3.1-70b-versatile' },
      { name: 'LLaMA 405b', code: 'llama-3.1-405b-reasoning' },
    ],
    'perplexity': [
      { name: 'Sonar Large Online', code: 'llama-3-sonar-large-32k-online' },
      { name: 'Llama 3 8b', code: 'llama-3-8b-instruct' },
      { name: 'Llama 3 70b', code: 'llama-3-70b-instruct' },
    ],
  }

  function handleSubmit(values: Values) {
    const parsedValues: ParsedValues = {
      id: Date.now(),
      model: values.model,
      api: values.api,
      systemMessage: instructions.text,
      conversation: [{ role: 'user', content: values.prompt, timestamp: Date.now() }],
      temperature: 0.7,
      stream: values.stream,
    }
    // showToast({ title: 'Submitted' });
    push(<Answer data={parsedValues} />)
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title='Submit' onSubmit={handleSubmit} />
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
        <Form.Dropdown.Item value='openai' title='Open AI' icon='openai-logo.svg' />
        <Form.Dropdown.Item value='anthropic' title='Anthropic' icon='anthropic-icon.png' />
        <Form.Dropdown.Item value='groq' title='Groq' icon='groq-icon.png' />
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
