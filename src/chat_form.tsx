import { Form, ActionPanel, Action, useNavigation } from '@raycast/api';
import Answer from './chat_answer';
import instructions from '../instructions.json';
import { useState } from 'react';
import * as fs from 'fs/promises';

type Values = {
  prompt: string;
  api: string;
  model: string;
  agent: string;
  temperature: string;
  stream: boolean;
  attachmentsDir: [string];
  reasoning: 'low' | 'medium' | 'high';
};

type ParsedValues = {
  id: number;
  temperature: number;
  conversation: Array<{
    role: 'user' | 'assistant',
    content: string | Array<{
      type: 'text' | 'document' | 'image',
      source?: object,
      text?: string
    }>,
    timestamp?: number
  }>;
  model: string;
  api?: string;
  systemMessage?: string;
  instructions?: string;
  stream?: boolean;
  assistantID?: string;
  threadID?: string;
  runID?: string;
  attachmentsDir: [string];
  reasoning: 'low' | 'medium' | 'high';
};


export default function ChatForm() {
  const { push } = useNavigation();
  // change to a better name: const [query, setQuery] = useState('');
  const [selectedAPI, setSelectedAPI] = useState<API>('anthropic'); // default

  type API = 'perplexity' | 'openai' | 'deepmind' | 'anthropic' | 'groq' | 'grok';
  type Model = { name: string, code: string };

  const APItoModels: Record<API, Model[]> = {
    'anthropic': [
      { name: 'Claude 3.7 Sonnet', code: 'claude-3-7-sonnet-latest' },
      { name: 'Claude 3.5 Haiku', code: 'claude-3-5-haiku-20241022' },
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

    //conversation with attachment and not

    let messages: ParsedValues["conversation"];
    if (values.attachmentsDir.length > 0 && values.agent == 'claude-3-7-sonnet-latest') {
      const localPdfPath: string = values.attachmentsDir[0];  // limit of one file only, for now
      const arrayBuffer = await fs.readFile(localPdfPath);
      const pdfBase64 = Buffer.from(arrayBuffer).toString('base64');
      messages = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: values.prompt,
            },
            {
              type: 'document',
              source: {
                media_type: 'application/pdf',
                type: 'base64',
                data: pdfBase64,
              }
            }
          ]
        }
      ]
    } else {
      messages = [{ role: 'user', content: values.prompt, timestamp: Date.now() }]
    }

    // let messagesWithAttachment;
    //   // const messagesWithAttachment: Data["conversation"]
    //
    //   // messages only support pdf's for now; can add images later on
    //   messagesWithAttachment = messages.at(-1).content

    const parsedValues: ParsedValues = {
      id: Date.now(),
      model: values.model,
      api: values.api,
      systemMessage: systemMessage,
      conversation: messages,
      temperature: Number(values.temperature),
      stream: values.stream,
      attachmentsDir: values.attachmentsDir,
      reasoning: values.reasoning,
    }
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
        <Form.Dropdown.Item value='perplexity' title='Perplexity' icon='perplexity-icon.png' />
        <Form.Dropdown.Item value='groq' title='Groq' icon='groq-icon.png' />
        <Form.Dropdown.Item value='grok' title='Grok' icon='groq-icon.png' />
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

      <Form.Dropdown id='reasoning' title='Reasoning Effort' >
        <Form.Dropdown.Item value='low' title='Low' />
        <Form.Dropdown.Item value='medium' title='Medium' />
        <Form.Dropdown.Item value='high' title='High' />
      </Form.Dropdown>

      <Form.TextField id='temperature' title='Temperature' defaultValue='1' info='Value from 0 to 2' />

      <Form.Checkbox id='stream' title='Streaming' label='Streaming or static response' defaultValue={true} />

      <Form.FilePicker id="attachmentsDir" />
    </Form>
  );
}
// streaming had before useEffect: 
// dynamic function for streaming option not working
