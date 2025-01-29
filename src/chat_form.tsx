import { Form, ActionPanel, Action, useNavigation } from '@raycast/api';
import Answer from './chat_answer';
import instructions from '../instructions.json';
import { useState } from 'react';

type Values = {
  prompt: string;
  api: string;
  model: string;
  agent: string;
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
  const [selectedAPI, setSelectedAPI] = useState<API>('anthropic'); // default

  type API = 'perplexity' | 'openai' | 'deepmind' | 'anthropic' | 'groq';
  type Model = { name: string, code: string };

  const APItoModels: Record<API, Model[]> = {
    'anthropic': [
      { name: 'Claude 3.5 Haiku', code: 'claude-3-5-haiku-20241022' },
      { name: 'Claude 3.5 Sonnet', code: 'claude-3-5-sonnet-latest' },
    ],
    'openai': [
      { name: 'GPT 4o Mini', code: 'gpt-4o-mini' },
      { name: 'GPT 4o', code: 'gpt-4o' },
      // if changing the code of o1, pay attention to sys limitations
      { name: 'o1 mini', code: 'o1-mini' },
      { name: 'o1', code: 'o1' },
    ],
    'deepmind': [
      { name: 'Gemini 2.0 Flash Experimental', code: 'models/gemini-2.0-flash-exp' },
      { name: 'Gemini 2.0 Flash Thinking', code: 'models/gemini-2.0-flash-thinking-exp-01-21' },
      { name: 'Gemini Experimental 1206', code: 'models/gemini-exp-1206' },
      { name: 'Gemini 1.5 Flash', code: 'models/gemini-1.5-flash' },
      { name: 'Gemini 1.5 Pro',  code: 'models/gemini-1.5-pro' },
    ],
    'groq': [
      // { name: 'LLaMA 3.2 1b', code: 'llama-3.2-1b-preview' },
      { name: 'LLaMA 3.2 3b', code: 'llama-3.2-1b-preview' },
      // { name: 'LLaMA 3.2 11b', code: 'llama-3.2-11b-text-preview' },
      { name: 'LLaMA 3.2 90b', code: 'llama-3.2-90b-text-preview' },
      // { name: 'LLaMA 405b', code: 'llama-3.1-405b-reasoning' },
    ],
    'perplexity': [
      { name: 'Sonar Large Online', code: 'llama-3.1-sonar-large-128k-online' },
      { name: 'Sonar Huge Online', code: 'llama-3.1-sonar-huge-128k-online' },
      { name: 'Llama 3.1 8b', code: 'llama-3.1-8b-instruct' },
      { name: 'Llama 3.1 70b', code: 'llama-3.1-70b-instruct' },
    ],
    // 'deepmind': [
    //   { name: 'Gemini 1.5 Flash', code: 'gemini-1.5-flash-002'},
    //   { name: 'Gemini 1.5 Pro', code: 'gemini-1.5-pro-002'},
    // ]
  }
 
  function handleSubmit(values: Values) {
    var systemMessage: string = "";

    switch (values.agent) {
    case 'efficient':
      systemMessage = instructions.efficient;
      break;
    case 'researcher':
      systemMessage = instructions.researcher;
      break;
    case 'coach':
      systemMessage = instructions.coach;
      break;
    case 'planner':
      systemMessage = instructions.planner;
      break;
    case 'writer':
      systemMessage = instructions.writer;
      break;
    }

    const parsedValues: ParsedValues = {
      id: Date.now(),
      model: values.model,
      api: values.api,
      systemMessage: systemMessage,
      conversation: [{ role: 'user', content: values.prompt, timestamp: Date.now() }],
      temperature: Number(values.temperature),
      stream: values.stream,
    }
    // showToast({ title: 'Submitted' });
    // console.log(parsedValues.systemMessage)
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
        <Form.Dropdown.Item value='anthropic' title='Anthropic' icon='anthropic-icon.png' />
        <Form.Dropdown.Item value='openai' title='Open AI' icon='openai-logo.svg' />
        <Form.Dropdown.Item value='deepmind' title='Deepmind' icon='deepmind-icon.png' />
        {/* <Form.Dropdown.Item value='google' title='Google' icon='google-gemini-icon.png' /> */}
        <Form.Dropdown.Item value='groq' title='Groq' icon='groq-icon.png' />
        <Form.Dropdown.Item value='perplexity' title='Perplexity' icon='perplexity-icon.png' />
      </Form.Dropdown>

      <Form.Dropdown id='model' title='Model'>
        {APItoModels[selectedAPI].map((model: Model) => (
          <Form.Dropdown.Item key={model.code} value={model.code} title={model.name} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id='agent' title='Agent' >
        <Form.Dropdown.Item value='efficient' title='Straight-to-the-point' />
        <Form.Dropdown.Item value='traditional' title='Traditional' />
        <Form.Dropdown.Item value='researcher' title='Researcher' />
        <Form.Dropdown.Item value='coach' title='Life and Professional Coach' />
        <Form.Dropdown.Item value='planner' title='Evaluator and Planner' />
        <Form.Dropdown.Item value='writer' title='Writer and Writing Guide' />
      </Form.Dropdown>

      <Form.TextField id='temperature' title='Temperature' defaultValue='1' info='Value from 0 to 2' />

      <Form.Checkbox id='stream' title='Streaming' label='Streaming or static response' defaultValue={true} />
    </Form>
  );
}
// streaming had before useEffect: 
// dynamic function for streaming option not working
