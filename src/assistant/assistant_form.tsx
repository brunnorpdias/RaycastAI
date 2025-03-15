// Navigation starts here and it's redirected to the page 'answer.tsx'
import { Form as Raycastform, ActionPanel, Action, useNavigation, showToast, Toast } from '@raycast/api';
import fs from 'fs';
import Answer from './assistant_answer';
import * as OpenAI from '../fetch/openAI';
// import instructions from '../instructions.json';

type Values = {
  assistant: string;
  prompt: string;
  instructions: string;
  files: string[];
  temperature: string;
};

type ParsedValues = {
  id: number;
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
  reasoning?: 'none' | 'low' | 'medium' | 'high';
  attachments?: [string];
  temperature: number;
  stream?: boolean;
  assistantInstructions?: string;
  assistantID?: string;
  threadID?: string;
  runID?: string;
  assistantAttachments?: Array<{ file_id: string, tools: Array<{ type: 'code_interpreter' | 'file_search' }> }>;
};

const model = 'gpt-4o';

export default function AssistantForm() {
  const { push } = useNavigation();

  async function handleSubmit(values: Values) {
    let parsedValues: ParsedValues = {
      model: model,
      assistantInstructions: `${values.instructions}`,
      conversation: [
        // { role: 'system', content: instructions.text },
        { role: 'user', content: values.prompt, timestamp: Date.now() }
      ],
      temperature: parseFloat(values.temperature),
      id: Date.now(),
      assistantID: '',
      threadID: '',
      runID: '',
      assistantAttachments: [],
    }

    const filePaths = values.files.filter((file: any) => fs.existsSync(file) && fs.lstatSync(file).isFile());

    if (values.assistant == 'PDFanalyser') {
      parsedValues.assistantID = 'asst_ASOeu7rF6Ry6p73RsRaQ789p';
      if (filePaths) {
        // Save thread in a local database
        const fileIDs = await OpenAI.UploadFiles(filePaths);
        if (fileIDs?.length) {
          for (let fileID of fileIDs) {
            parsedValues.assistantAttachments?.push({ file_id: fileID, tools: [{ type: 'file_search' }] })
            // parsedValues.attachments?.push({ file_id: fileID })
          };
        }
      }

      // Create a thread, but leave the messages to be included later
      const newThread = await OpenAI.CreateThread();
      parsedValues.threadID = newThread.id;
    } else {
      // else if coding assistant...
    }

    if (parsedValues.threadID) {
      showToast({ title: 'Thread Created' });
      push(<Answer data={parsedValues} />)
    } else {
      showToast({ title: 'Thread Creation Failed', style: Toast.Style.Failure });
    }
  }

  return (
    <Raycastform
      actions={
        <ActionPanel>
          <Action.SubmitForm title='Submit' onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {/* Use assistants from openai list assistants fetching */}
      <Raycastform.Dropdown id='assistant' title='Assistant'>
        <Raycastform.Dropdown.Item key='pdfAnalyser' value='PDFanalyser' title='Document Analyser' />
        <Raycastform.Dropdown.Item key='cvAnalyser' value='CVanalyser' title='CV Analyser' />
        <Raycastform.Dropdown.Item key='' value='' title='Coding Assistant' />
        <Raycastform.Dropdown.Item key='' value='' title='Writing Tutor' />
        <Raycastform.Dropdown.Item key='' value='' title='Writing Assistant' />
        <Raycastform.Dropdown.Item key='' value='' title='Brainstorming Partner' />
        <Raycastform.Dropdown.Item key='' value='' title='Decision Helper' />
        <Raycastform.Dropdown.Item key='' value='' title='Mental Health Coach' />
        <Raycastform.Dropdown.Item key='' value='' title='Career Coah' />
        {/* <Form.Dropdown.Item key='coding' value='Your jobs is to help the user with his coding project' title='Coding' /> */}
      </Raycastform.Dropdown>

      <Raycastform.TextArea id='instructions' title='Instructions' placeholder='What do you want the assistant to do' />
      <Raycastform.TextArea id='prompt' title='Prompt' placeholder='Describe your request here' enableMarkdown={true} />

      <Raycastform.TextField id='temperature' title='Temperature' defaultValue='0.7' placeholder='0.7' />
      <Raycastform.FilePicker id='files' allowMultipleSelection={true} />
    </Raycastform>
  );
}
