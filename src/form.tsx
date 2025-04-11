import { Form, ActionPanel, Action, useNavigation, Cache as RaycastCache } from '@raycast/api';
import { useState } from 'react';

import { type Data, type API, type Model, APItoModels } from './utils/types'
import { reasoningModels, toolSupportModels, attachmentModels, sttModels } from './utils/types';
import Answer from "./views/answer";
import instructionsObject from './enums/instructions.json';
import personalObj from './enums/personal_info.json';

type Values = {
  prompt: string;
  api: API;
  model: Model;
  private: boolean,
  web: boolean,
  instructions: 'traditional' | 'concise' | 'socratic' | 'developer';
  temperature: string;
  stream: boolean;
  attatchmentPaths: [string];
  reasoning: 'none' | 'low' | 'medium' | 'high';
};

export default function ChatForm() {
  const { push } = useNavigation();
  const [selectedAPI, setAPI] = useState<API>('openai');
  const [selectedModel, setModel] = useState<Model>('chatgpt-4o-latest');

  async function handleSubmit(values: Values) {
    const messages: Data["messages"] = values.api === 'openai' ?
      [{ role: 'user', content: [{ type: 'input_text', text: values.prompt }], timestamp: Date.now() }] :
      [{ role: 'user', content: values.prompt, timestamp: Date.now() }]

    let instructions: string;
    switch (values.instructions) {
      case 'traditional':
        instructions = instructionsObject.traditional;
        break;
      case 'socratic':
        instructions = instructionsObject.socratic;
        break;
      case 'developer':
        instructions = instructionsObject.developer;
        break
      case 'concise':
        instructions = instructionsObject.concise;
        break;
    }

    instructions += ('' + `Always provide the answer of mathematical equations in latex using the delimiters
                           \\( for inline math and \\[ for block equations. Provide the answers in markdown.`);
    const personalInfo: string | undefined = personalObj ? personalObj.personal_info : undefined;

    const data: Data = {
      timestamp: Date.now(),
      model: values.model,
      api: values.api,
      instructions: values.private ? instructions : `${instructions} ${personalInfo}`,
      messages: messages,
      temperature: 1, // Number(values.temperature),
      tools: values.web ? 'web' : undefined,
      attachments: [],
      reasoning: values.reasoning,
      private: values.private,
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
        <Form.Dropdown.Item value='openrouter' title='OpenRouter' icon='open_router-logo.png' />
      </Form.Dropdown>

      <Form.Dropdown
        id='model'
        title='Model'
        onChange={(model) => setModel(model as Model)}
      >
        {APItoModels[selectedAPI].map((model) => (
          <Form.Dropdown.Item key={model.code} value={model.code} title={model.name} />
        ))}
      </Form.Dropdown>

      {reasoningModels.includes(selectedModel) && (
        <Form.Dropdown id='reasoning' title='Reasoning Effort' >
          <Form.Dropdown.Item value='none' title='None' />
          <Form.Dropdown.Item value='low' title='Low' />
          <Form.Dropdown.Item value='medium' title='Medium' />
          <Form.Dropdown.Item value='high' title='High' />
        </Form.Dropdown>
      )}

      {!sttModels.includes(selectedModel) && (
        <Form.Dropdown id='instructions' title='instructions' >
          <Form.Dropdown.Item value='traditional' title='Traditional' />
          <Form.Dropdown.Item value='concise' title='Concise' />
          <Form.Dropdown.Item value='socratic' title='Socratic' />
          <Form.Dropdown.Item value='developer' title='Developer' />
        </Form.Dropdown>
      )}

      {/* <Form.TextField id='temperature' title='Temperature' defaultValue='1' info='Value from 0 to 2' /> */}

      {attachmentModels.includes(selectedModel) && (
        <Form.FilePicker id="attatchmentPaths" />
      )}

      {toolSupportModels.includes(selectedModel) && (
        <Form.Checkbox id="web" label="Search the Web" defaultValue={false} />
      )}

      <Form.Checkbox id="private" label="Data Privacy" defaultValue={false} />

    </Form>
  );
}
