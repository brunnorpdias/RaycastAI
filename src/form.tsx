import { Form, ActionPanel, Action, useNavigation } from '@raycast/api';
import { useState } from 'react';

import { type Data, type API, type Model, APItoModels } from './utils/types'

import { reasoningModels, toolSupportModels, attachmentModels, privateModeAPIs, sttModels } from './utils/types';
import Answer from "./views/answer";
import instructionsObject from './enums/instructions.json';
import personalObj from './enums/personal_info.json';
import * as Functions from './utils/functions';

type Values = {
  prompt: string;
  api: API;
  model: Model;
  private: boolean,
  web: boolean,
  intent: ('base' | 'researcher' | 'practitioner' | 'coach' | 'tutor' | 'concise' | 'socratic' | 'exploratory')[];
  temperature: string;
  stream: boolean;
  attatchmentPaths?: [string];
  reasoning: 'none' | 'low' | 'medium' | 'high';
};

export default function ChatForm() {
  const api: API = Object.keys(APItoModels).at(0) as API;
  const model: Model = APItoModels[api].at(0)?.code as Model;
  const { push } = useNavigation();
  const [selectedAPI, setAPI] = useState<API>(api);
  const [selectedModel, setModel] = useState<Model>(model);

  async function handleSubmit(values: Values) {
    // let instructions: string = instructionsObject["base"];
    // let additionalInstructions: string[] = values.intent.map(key => instructionsObject[key]);
    // instructions += additionalInstructions.join(' ');
    let instructions: string = values.intent.map(key => instructionsObject[key]).join(" ");

    const personalInfo: string | undefined = personalObj ? personalObj.personal_info : undefined;
    const timestamp = Date.now();
    const messages: Data["messages"] = [{ role: 'user', content: values.prompt, timestamp: timestamp }]

    let data: Data = {
      timestamp: timestamp,
      model: values.model,
      api: values.api,
      messages: messages,
      instructions: values.private ? instructions : `${instructions} ${personalInfo}`,
      tools: values.web ? 'web' : undefined,
      files: [],
      reasoning: values.reasoning,
    }

    if (values.attatchmentPaths && values.attatchmentPaths?.length > 0) {
      await Functions.ProcessFiles(data, values.attatchmentPaths, timestamp)
    }

    await Functions.Cache(data)

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

      {reasoningModels.includes(selectedModel) && (
        <Form.Dropdown id='reasoning' title='Reasoning Effort' defaultValue='low' >
          <Form.Dropdown.Item value='none' title='None' />
          <Form.Dropdown.Item value='low' title='Low' />
          <Form.Dropdown.Item value='medium' title='Medium' />
          <Form.Dropdown.Item value='high' title='High' />
        </Form.Dropdown>
      )}

      {/* {!sttModels.includes(selectedModel) && ( */}
      {/*   <Form.Dropdown id='instructions' title='instructions' > */}
      {/*     <Form.Dropdown.Item value='traditional' title='Traditional' /> */}
      {/*     <Form.Dropdown.Item value='concise' title='Concise' /> */}
      {/*     <Form.Dropdown.Item value='socratic' title='Socratic' /> */}
      {/*     <Form.Dropdown.Item value='developer' title='Developer' /> */}
      {/*   </Form.Dropdown> */}
      {/* )} */}


      {!sttModels.includes(selectedModel) && (
        <Form.TagPicker id='intent' title='Intent' defaultValue={["base"]} >
          <Form.TagPicker.Item value='base' title='Base' />
          <Form.TagPicker.Item value='researcher' title='Researcher' />
          <Form.TagPicker.Item value='practitioner' title='Practitioner' />
          <Form.TagPicker.Item value='coach' title='Coach' />
          <Form.TagPicker.Item value='concise' title='Concise' />
          <Form.TagPicker.Item value='tutor' title='Tutor' />
          <Form.TagPicker.Item value='concise' title='Concise' />
          <Form.TagPicker.Item value='socratic' title='Socratic' />
          <Form.TagPicker.Item value='exploratory' title='Exploratory' />
        </Form.TagPicker>
      )}

      {/* <Form.TextField id='temperature' title='Temperature' defaultValue='1' info='Value from 0 to 2' /> */}

      {attachmentModels.includes(selectedModel) && (
        <Form.FilePicker id="attatchmentPaths" />
      )}

      {toolSupportModels.includes(selectedModel) && (
        <Form.Checkbox id="web" label="Search the Web" defaultValue={false} />
      )}

      {privateModeAPIs.includes(selectedAPI) && (
        <Form.Checkbox id="private" label="Data Privacy" defaultValue={false} />
      )}

    </Form>
  );
}
