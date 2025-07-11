import { Form, ActionPanel, Action, useNavigation } from '@raycast/api';
import { useState } from 'react';
import fs from 'fs';
import path from 'path';

import { type Data, type API, type Model, APItoModels } from './utils/models'

import * as ModelInfo from './utils/models';
import Answer from "./views/answer";
import * as Functions from './utils/functions';

type Values = {
  prompt: string;
  api: API;
  model: Model;
  persona: 'default' | 'coach' | 'collaborator' | 'tutor',
  attatchmentPaths?: [string];
  reasoning: 'none' | 'low' | 'medium' | 'high';
  web: boolean,
  deepResearch: boolean;
  temperature: string;
  private: boolean,
};


export default function ChatForm() {
  const api: API = Object.keys(APItoModels).at(0) as API;
  const model: Model = APItoModels[api].at(0)?.code as Model;
  const { push } = useNavigation();
  const [selectedAPI, setAPI] = useState<API>(api);
  const [selectedModel, setModel] = useState<Model>(model);

  async function handleSubmit(values: Values) {
    const timestamp = Date.now();
    function loadInstruction(filename: string, subDir?: string) {
      let filePath;
      if (subDir) {
        filePath = path.join(__dirname, 'assets', 'instructions', subDir, `${filename}.md`);
      } else {
        filePath = path.join(__dirname, 'assets', 'instructions', `${filename}.md`);
      }
      return fs.readFileSync(filePath, 'utf8')
    }

    const instructions = (
      loadInstruction('base') +
      (!values.private ? loadInstruction('personal') : '') +
      loadInstruction(values.persona, 'personas') //+
      // values.modifiers.map(mod => loadInstruction(mod, 'modifiers')).join('')
    )

    const personaTemp: Record<string, number> = {
      default: 0.30,
      coach: 0.35,
      collaborator: 0.40,
      tutor: 0.30,
    };
    let temp = personaTemp[values.persona] ?? 0.30;

    // const modifierDelta: Record<string, number> = {
    //   concise: -0.10,
    //   creative: 0.35,
    //   socratic: -0.05,
    // };
    // for (const mod of values.modifiers) {
    //   temp += modifierDelta[mod] ?? 0;
    // }
    //
    // temp = Math.min(Math.max(temp, 0), 1);

    const tools = [
      values.web ? 'web' : null,
      values.deepResearch ? 'deepResearch' : null
    ].filter(Boolean) as Data["tools"]

    let fileInfos: Data["files"] = [];
    if (values.attatchmentPaths && values.attatchmentPaths?.length > 0) {
      fileInfos = await Functions.ProcessFiles(values.attatchmentPaths, timestamp)
    }

    let data: Data = {
      workflowState: values.deepResearch ? 'dr_queued' : 'chat_queued',
      timestamp: timestamp,
      model: values.deepResearch ? `${values.model}-deep-research` : values.model,
      api: values.api,
      messages: [{ role: 'user', content: values.prompt, timestamp: timestamp }],
      files: fileInfos,
      instructions: instructions,
      reasoning: values.reasoning,
      tools: tools,
      temperature: ModelInfo.reasoningModels.includes(values.model) ? undefined : temp
    }

    if (!data.tools?.includes('deepResearch')) {
      await Functions.CacheChat(data)
    }

    push(<Answer data={data} />);  // for DR, the api call will improve the prompt before starting the research
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
        {/* change this to list according to the types list */}
        <Form.Dropdown.Item value='deepmind' title='Deepmind' icon='deepmind-icon.png' />
        <Form.Dropdown.Item value='openai' title='Open AI' icon='openai-logo.svg' />
        <Form.Dropdown.Item value='anthropic' title='Anthropic' icon='anthropic-icon.png' />
        <Form.Dropdown.Item value='openrouter' title='OpenRouter' icon='open_router-logo.png' />
        <Form.Dropdown.Item value='ollama' title='Ollama' icon='ollama-icon.png' />
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

      {ModelInfo.reasoningModels.includes(selectedModel) && (
        <Form.Dropdown id='reasoning' title='Reasoning Effort' defaultValue='low' >
          <Form.Dropdown.Item value='none' title='None' />
          <Form.Dropdown.Item value='low' title='Low' />
          <Form.Dropdown.Item value='medium' title='Medium' />
          <Form.Dropdown.Item value='high' title='High' />
        </Form.Dropdown>
      )}

      {!ModelInfo.sttModels.includes(selectedModel) && (
        <Form.Dropdown id='persona' title='Persona' >
          <Form.Dropdown.Item value='default' title='Default' />
          <Form.Dropdown.Item value='coach' title='Coach' />
          <Form.Dropdown.Item value='collaborator' title='Collaborator' />
          <Form.Dropdown.Item value='tutor' title='Tutor' />
        </Form.Dropdown>
      )}

      {ModelInfo.attachmentModels.includes(selectedModel) && (
        <Form.FilePicker id="attatchmentPaths" />
      )}

      {ModelInfo.toolModels.includes(selectedModel) && (
        <Form.Checkbox id="web" label="Search the Web" defaultValue={false} />
      )}

      {/* not active yet, still need to create the research api call and ui */}

      {/* {ModelInfo.deepResearchModels.includes(selectedModel) && ( */}
      {/*   <Form.Checkbox id="deepResearch" label="Deep Research" defaultValue={false} /> */}
      {/* )} */}

      <Form.Checkbox id="private" label="Data Privacy" defaultValue={true} />

    </Form>
  );
}
