import { Form, ActionPanel, Action, useNavigation } from '@raycast/api';
import Answer from "./chat_answer";
import instructions from '../instructions.json';
import { useState } from 'react';

type Values = {
  prompt: string;
  api: string;
  model: string;
  agent: string;
  temperature: string;
  stream: boolean;
  attatchmentPaths: [string];
  reasoning: 'none' | 'low' | 'medium' | 'high';
};

export type Data = {
  id: number;
  // status: 'sreaming' | 'thinking' | 'idle'
  messages: Array<{
    role: 'user' | 'assistant' | 'system',
    content: string | Array<{
      type: 'text' | 'document' | 'image' | 'file',
      source?: object,
      text?: string,
      file?: object
    }>,
    timestamp?: number
  }>;
  model: string;
  api?: string;
  systemMessage?: string;
  reasoning?: 'none' | 'low' | 'medium' | 'high';
  attachments?: Array<{ status: 'waiting' | 'uploaded', name: string, path: string }>;
  temperature: number;
  stream?: boolean;
  assistantInstructions?: string;
  assistantID?: string;
  threadID?: string;
  runID?: string;
  assistantAttachments?: Array<{ file_id: string, tools: Array<{ type: 'code_interpreter' | 'file_search' }> }>;
};


export default function ChatForm() {
  const { push } = useNavigation();
  const [selectedAPI, setAPI] = useState<API>('anthropic');
  const [selectedModel, setModel] = useState<string>('');

  type API = 'perplexity' | 'openai' | 'deepmind' | 'anthropic' | 'groq' | 'grok';
  type Model = { name: string, code: string };

  const APItoModels: Record<API, Model[]> = {
    'anthropic': [
      { name: 'Claude 3.5 Haiku', code: 'claude-3-5-haiku-latest' },
      { name: 'Claude 3.7 Sonnet', code: 'claude-3-7-sonnet-latest' },
    ],
    'openai': [
      { name: 'GPT 4o', code: 'gpt-4o' },
      { name: 'GPT 4o Search', code: 'gpt-4o-search-preview' },
      { name: 'o3 mini', code: 'o3-mini' },
      { name: 'o1', code: 'o1' },
      { name: 'GPT 4.5', code: 'gpt-4.5-preview' },
      { name: 'GPT 4o Mini', code: 'gpt-4o-mini' },
    ],
    'deepmind': [
      { name: 'Gemini 2.0 Flash', code: 'models/gemini-2.0-flash' },
      { name: 'Gemini 2.0 Flash Thinking Experimental', code: 'models/gemini-2.0-flash-thinking-exp-01-21' },
      { name: 'Gemini 2.0 Flash Experimental', code: 'models/gemini-2.0-flash-exp' },
      { name: 'Gemini 2.0 Pro Experimental', code: 'models/gemini-2.0-pro-exp-02-05' },
    ],
    'perplexity': [
      { name: 'Sonar Deep Research', code: 'sonar-deep-research' },
      { name: 'Sonar Reasoning Pro', code: 'sonar-reasoning-pro' },
      { name: 'Sonar Pro', code: 'sonar-pro' },
      { name: 'Sonar', code: 'sonar' },
    ],
    'grok': [
      { name: 'Grok 2', code: 'grok-2-latest' },
    ],
    'groq': [
      { name: 'LLaMA 3.2 3b', code: 'llama-3.2-1b-preview' },
      { name: 'LLaMA 3.2 90b', code: 'llama-3.2-90b-text-preview' },
    ],
    // 'deepmind': [
    //   { name: 'Gemini 1.5 Flash', code: 'gemini-1.5-flash-002'},
    //   { name: 'Gemini 1.5 Pro', code: 'gemini-1.5-pro-002'},
    // ]
  }

  async function handleSubmit(values: Values) {
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

    const data: Data = {
      id: Date.now(),
      model: values.model,
      api: values.api,
      systemMessage: systemMessage,
      messages: [
        {
          role: 'user',
          content: values.prompt,
          timestamp: Date.now()
        }
      ],// messages,
      temperature: 1, //Number(values.temperature),
      stream: true, //values.stream,
      // attachments: values.attatchmentPaths,
      attachments: [],
      reasoning: values.reasoning,
    }

    if (data.attachments && values.attatchmentPaths && values.attatchmentPaths.length > 0) {
      for (const attachmentPath of values.attatchmentPaths) {
        const filename = attachmentPath.slice(attachmentPath.lastIndexOf('/') + 1);
        data.attachments.push(
          { status: 'waiting', name: filename, path: attachmentPath }
        )
      }
    }
    push(<Answer data={data} />);
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
        onChange={(api) => setAPI(api as API)}
      >
        <Form.Dropdown.Item value='anthropic' title='Anthropic' icon='anthropic-icon.png' />
        <Form.Dropdown.Item value='openai' title='Open AI' icon='openai-logo.svg' />
        <Form.Dropdown.Item value='deepmind' title='Deepmind' icon='deepmind-icon.png' />
        {/* <Form.Dropdown.Item value='google' title='Google' icon='google-gemini-icon.png' /> */}
        <Form.Dropdown.Item value='perplexity' title='Perplexity' icon='perplexity-icon.png' />
        <Form.Dropdown.Item value='groq' title='Groq' icon='groq-icon.png' />
        <Form.Dropdown.Item value='grok' title='Grok' icon='grok-logo-icon.png' />
      </Form.Dropdown>

      <Form.Dropdown
        id='model'
        title='Model'
        onChange={(model) => setModel(model)}
      >
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

      {['claude-3-7-sonnet-latest', 'o1', 'o3-mini'].includes(selectedModel) && (
        <Form.Dropdown id='reasoning' title='Reasoning Effort' >
          <Form.Dropdown.Item value='none' title='None' />
          <Form.Dropdown.Item value='low' title='Low' />
          <Form.Dropdown.Item value='medium' title='Medium' />
          <Form.Dropdown.Item value='high' title='High' />
        </Form.Dropdown>
      )}

      {/* <Form.TextField id='temperature' title='Temperature' defaultValue='1' info='Value from 0 to 2' /> */}
      {/* <Form.Checkbox id='stream' title='Streaming' label='Streaming or static response' defaultValue={true} /> */}

      {['claude-3-7-sonnet-latest', 'gpt-4o', 'gpt-4o-mini', 'o1', 'gpt-4.5-preview'].includes(selectedModel) && (
        <Form.FilePicker id="attatchmentPaths" />
      )}
    </Form>
  );
}
