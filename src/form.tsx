import { Form, ActionPanel, Action, useNavigation } from "@raycast/api";

import { useState } from "react";
import fs from "fs";
import path from "path";

import { type ChatSession, type API, type Model, Role, ReasoningLevel, ApiToModels, apiDetails } from "./utils/models";

import * as ModelInfo from "./utils/models";
import Answer from "./views/answer";
import * as Functions from "./utils/functions";

type Values = {
  prompt: string;
  api: API;
  model: Model;
  persona: "generalist" | "tutor" | "collaborator" | "strategist" | "dev" | "writer" | "researcher";
  attatchmentPaths?: string[];
  reasoning: ReasoningLevel;
  web: boolean;
  code: boolean;
  private: boolean;
};

export default function ChatForm() {
  // const api: API = Object.keys(ApiToModels).at(0) as API;
  const { push } = useNavigation();
  // const api: API = Object.keys(apiDetails).at(0) as API;
  const api: API = apiDetails.at(0)?.code as API;
  const model: Model = ApiToModels[api].at(0)?.code as Model;
  const [selectedAPI, setAPI] = useState<API>(api);
  const [selectedModel, setModel] = useState<Model>(model);

  async function handleSubmit(values: Values) {
    const timestamp = Date.now();
    function loadInstruction(filename: string, subDir?: string) {
      let filePath;
      if (subDir) {
        filePath = path.join(__dirname, "assets", "instructions", subDir, `${filename}.md`);
      } else {
        filePath = path.join(__dirname, "assets", "instructions", `${filename}.md`);
      }
      return fs.readFileSync(filePath, "utf8");
    }

    const instructions =
      loadInstruction("base") +
      (!values.private ? loadInstruction("personal") : "") +
      loadInstruction(values.persona, "personas"); //+
    // values.modifiers.map(mod => loadInstruction(mod, 'modifiers')).join('')

    // const personaTemp: Record<string, number> = {
    //   default: 0.30,
    //   coach: 0.35,
    //   collaborator: 0.40,
    //   tutor: 0.30,
    // };
    // let temp = personaTemp[values.persona] ?? 0.30;

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

    const tools = [values.web ? "web" : null, values.code ? "code" : null].filter(Boolean) as ChatSession["tools"];

    let fileInfos: ChatSession["files"] = [];
    if (values.attatchmentPaths && values.attatchmentPaths?.length > 0) {
      fileInfos = await Functions.ProcessFiles(values.attatchmentPaths, timestamp);
    }

    const chat: ChatSession = {
      workflowStage: "chat_queued",
      timestamp: timestamp,
      model: values.model,
      api: values.api,
      messages: [{ role: Role.User, content: values.prompt, timestamp: timestamp }],
      files: fileInfos,
      instructions: instructions,
      reasoning: values.reasoning,
      tools: tools,
      private: values.private,
      // temperature: ModelInfo.reasoningModels.includes(values.model) ? undefined : temp
    };

    await Functions.CacheChat(chat);

    push(<Answer chat={chat} />);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="prompt" title="Prompt" placeholder="Describe your request here" enableMarkdown={true} />

      <Form.Dropdown id="api" title="API" onChange={(api) => setAPI(api as API)}>
        {apiDetails.map((a) => (
          <Form.Dropdown.Item value={a.code} title={a.name} icon={a.image} key={a.code} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="model" title="Model" onChange={(model) => setModel(model as Model)}>
        {ApiToModels[selectedAPI].map((model) => (
          <Form.Dropdown.Item key={model.code} value={model.code} title={model.name} />
        ))}
      </Form.Dropdown>

      {ModelInfo.reasoningModels.includes(selectedModel) && (
        <Form.Dropdown id="reasoning" title="Reasoning Effort" defaultValue={ReasoningLevel.Low}>
          <Form.Dropdown.Item value={ReasoningLevel.None} title="None" />
          {/* <Form.Dropdown.Item value={ReasoningLevel.Auto} title='Auto' /> */}
          <Form.Dropdown.Item value={ReasoningLevel.Low} title="Low" />
          <Form.Dropdown.Item value={ReasoningLevel.Medium} title="Medium" />
          <Form.Dropdown.Item value={ReasoningLevel.High} title="High" />
        </Form.Dropdown>
      )}

      {!ModelInfo.sttModels.includes(selectedModel) && (
        <Form.Dropdown id="persona" title="Persona">
          <Form.Dropdown.Item value="generalist" title="Generalist" />
          <Form.Dropdown.Item value="collaborator" title="Collaborator" />
          <Form.Dropdown.Item value="strategist" title="Strategist" />
          <Form.Dropdown.Item value="dev" title="Developer" />
          <Form.Dropdown.Item value="tutor" title="Tutor" />
          <Form.Dropdown.Item value="researcher" title="Researcher" />
          <Form.Dropdown.Item value="writer" title="Writer" />
        </Form.Dropdown>
      )}

      {ModelInfo.attachmentModels.includes(selectedModel) && <Form.FilePicker id="attatchmentPaths" />}

      <Form.Checkbox id="private" label="Data Privacy" defaultValue={true} />

      {ModelInfo.toolModels.includes(selectedModel) && (
        <Form.Checkbox id="web" label="Web Search" defaultValue={false} />
      )}

      {/* {ModelInfo.toolModels.includes(selectedModel) && ( */}
      {/*   <Form.Checkbox id="code" label="Code Interpreter" defaultValue={false} /> */}
      {/* )} */}
    </Form>
  );
}
