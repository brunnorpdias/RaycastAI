// Navigation starts here and it's redirected to the page 'answer.tsx'
import { Form as Raycastform, ActionPanel, Action, useNavigation, showToast, Toast } from '@raycast/api';
import fs from 'fs';
import Answer from './assistant_answer';
import * as OpenAI from './fetch/openAI';
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

const model = 'gpt-4o';

export default function AssistantForm() {
  const { push } = useNavigation();

  async function handleSubmit(values: Values) {
    let parsedValues: ParsedValues = {
      model: model,
      instructions: `${values.instructions}`,
      conversation: [
        // { role: 'system', content: instructions.text },
        { role: 'user', content: values.prompt, timestamp: Date.now() }
      ],
      temperature: parseFloat(values.temperature),
      id: Date.now(),
      assistantID: '',
      threadID: '',
      runID: '',
      attachments: [],
    }

    const filePaths = values.files.filter((file: any) => fs.existsSync(file) && fs.lstatSync(file).isFile());

    if (values.assistant == 'PDFanalyser') {
      parsedValues.assistantID = 'asst_ASOeu7rF6Ry6p73RsRaQ789p';
      if (filePaths) {
        // Save thread in a local database
        const fileIDs = await OpenAI.UploadFiles(filePaths);
        if (fileIDs?.length) {
          for (let fileID of fileIDs) {
            parsedValues.attachments?.push({ file_id: fileID, tools: [{ type: 'file_search' }] })
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
        <Raycastform.Dropdown.Item key='analyser' value='PDFanalyser' title='Document Analyser' />
        {/* <Form.Dropdown.Item key='coding' value='Your jobs is to help the user with his coding project' title='Coding' /> */}
      </Raycastform.Dropdown>

      <Raycastform.TextArea id='instructions' title='Instructions' placeholder='What do you want the assistant to do' />
      <Raycastform.TextArea id='prompt' title='Prompt' placeholder='Describe your request here' enableMarkdown={true} />

      <Raycastform.TextField id='temperature' title='Temperature' defaultValue='0.7' placeholder='0.7' />
      <Raycastform.FilePicker id='files' allowMultipleSelection={true} />
    </Raycastform>
  );
}
