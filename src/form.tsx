import { Form, ActionPanel, Action, useNavigation, Cache as RaycastCache } from '@raycast/api';
import { useState } from 'react';

import Answer from "./answer";
import instructionsObject from './enums/instructions.json';

type Values = {
  prompt: string;
  api: string;
  model: string;
  private: boolean,
  web: boolean,
  instructions: string;
  temperature: string;
  stream: boolean;
  attatchmentPaths: [string];
  reasoning: 'none' | 'low' | 'medium' | 'high';
};

export type Data = {
  timestamp: number;
  // status: 'idle' | 'streaming'
  messages: Array<{
    id?: string,
    timestamp: number,
    role: 'user' | 'assistant' | 'system',
    content: string | Array<{  // change this formatting, this is irrelevant for storing purposes
      type: 'text' | 'file' | 'image' | 'document' | 'input_text' | 'input_file' | 'input_image',
      source?: object,
      text?: string,
      file?: object
    }>,
  }>;
  model: string;
  api: string;
  instructions: string;
  tools?: string;
  reasoning: 'none' | 'low' | 'medium' | 'high';
  attachments: Array<{
    id?: string,
    status: 'idle' | 'staged' | 'uploaded',
    name: string,
    extension: string,
    path: string,
    // data?: string,
  }>;
  temperature: number;
  private?: boolean;
};


export default function ChatForm() {
  const { push } = useNavigation();
  const [selectedAPI, setAPI] = useState<API>('openai');
  const [selectedModel, setModel] = useState<string>('');

  type API = 'openai' | 'deepmind' | 'anthropic' | 'grok' | 'perplexity';
  type Model = { name: string, code: string };

  const APItoModels: Record<API, Model[]> = {
    'openai': [
      { name: 'GPT 4o', code: 'gpt-4o' },
      { name: 'o3 mini', code: 'o3-mini' },
      { name: 'o1', code: 'o1' },
      { name: 'GPT 4.5', code: 'gpt-4.5-preview' },
      // { name: 'GPT 4o Search', code: 'gpt-4o-search-preview' },  // no support through responses api
      // { name: 'GPT 4o Mini', code: 'gpt-4o-mini' },
    ],
    'deepmind': [
      { name: 'Gemini 2.0 Flash', code: 'gemini-2.0-flash' },
      { name: 'Gemini 2.0 Flash Thinking Experimental', code: 'gemini-2.0-flash-thinking-exp-01-21' },
      { name: 'Gemini 2.5 Pro', code: 'gemini-2.5-pro-exp-03-25' },
    ],
    'anthropic': [
      { name: 'Claude 3.7 Sonnet', code: 'claude-3-7-sonnet-latest' },
      { name: 'Claude 3.5 Haiku', code: 'claude-3-5-haiku-latest' },
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
  }

  async function handleSubmit(values: Values) {
    var instructions: string = "";

    switch (values.instructions) {
      case 'efficient':
        instructions = instructionsObject.efficient;
        break;
      case 'researcher':
        instructions = instructionsObject.researcher;
        break;
      case 'coach':
        instructions = instructionsObject.coach;
        break;
      case 'planner':
        instructions = instructionsObject.planner;
        break;
      case 'writer':
        instructions = instructionsObject.writer;
        break;
    }

    const messages: Data["messages"] = values.api === 'openai' ?
      [{ role: 'user', content: [{ type: 'input_text', text: values.prompt }], timestamp: Date.now() }] :
      [{ role: 'user', content: values.prompt, timestamp: Date.now() }]

    const data: Data = {
      timestamp: Date.now(),
      model: values.model,
      api: values.api,
      instructions: instructions || '',
      messages: messages,
      temperature: 1, // Number(values.temperature),
      tools: values.web ? 'web' : undefined,
      attachments: [],
      reasoning: values.reasoning,
      private: values.private,
      // status: 'streaming',
    }

    if (data.attachments && values.attatchmentPaths && values.attatchmentPaths.length > 0) {
      for (const path of values.attatchmentPaths) {
        const file = path.slice(path.lastIndexOf('/') + 1);
        const name = file.slice(0, file.lastIndexOf('.'))
        const extension = file.slice(file.lastIndexOf('.') + 1)
        data.attachments.push({
          status: 'idle',
          name: name,
          extension: extension,
          path: path,
        })
      }
    }

    const cache = new RaycastCache()
    const stringCache = cache.get('cachedData');
    let newCache: Data[];
    if (stringCache) {
      const oldCache = JSON.parse(stringCache);
      newCache = [data, ...oldCache]
    } else {
      newCache = [data]
    }
    cache.set('cachedData', JSON.stringify(newCache))

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
        <Form.Dropdown.Item value='openai' title='Open AI' icon='openai-logo.svg' />
        <Form.Dropdown.Item value='deepmind' title='Deepmind' icon='deepmind-icon.png' />
        <Form.Dropdown.Item value='anthropic' title='Anthropic' icon='anthropic-icon.png' />
        <Form.Dropdown.Item value='grok' title='Grok' icon='grok-logo-icon.png' />
        <Form.Dropdown.Item value='perplexity' title='Perplexity' icon='perplexity-icon.png' />
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

      {['claude-3-7-sonnet-latest', 'o1', 'o3-mini'].includes(selectedModel) && (
        <Form.Dropdown id='reasoning' title='Reasoning Effort' >
          <Form.Dropdown.Item value='none' title='None' />
          <Form.Dropdown.Item value='low' title='Low' />
          <Form.Dropdown.Item value='medium' title='Medium' />
          <Form.Dropdown.Item value='high' title='High' />
        </Form.Dropdown>
      )}

      {/* <Form.Dropdown id='instructions' title='instructions' > */}
      {/*   <Form.Dropdown.Item value='efficient' title='Straight-to-the-point' /> */}
      {/*   <Form.Dropdown.Item value='traditional' title='Traditional' /> */}
      {/*   <Form.Dropdown.Item value='researcher' title='Researcher' /> */}
      {/*   <Form.Dropdown.Item value='coach' title='Life and Professional Coach' /> */}
      {/*   <Form.Dropdown.Item value='planner' title='Evaluator and Planner' /> */}
      {/*   <Form.Dropdown.Item value='writer' title='Writer and Writing Guide' /> */}
      {/* </Form.Dropdown> */}

      {/* <Form.TextField id='temperature' title='Temperature' defaultValue='1' info='Value from 0 to 2' /> */}

      {[
        'claude-3-7-sonnet-latest',
        'gpt-4o', 'gpt-4o-mini', 'o1', 'gpt-4.5-preview',
        'gemini-2.0-flash', 'gemini-2.5-pro-exp-03-25'
      ].includes(selectedModel) && (
          <Form.FilePicker id="attatchmentPaths" />
        )}

      {['gpt-4o', 'gpt-4o-mini', 'o1', 'gpt-4.5-preview'].includes(selectedModel) && (
        <Form.Checkbox id="web" label="Search the Web" defaultValue={false} />
      )}

      <Form.Checkbox id="private" label="Data Privacy" defaultValue={true} />

    </Form>
  );
}
