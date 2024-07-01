// Navigation starts here and it's redirected to the page 'answer.tsx'
import { Form, ActionPanel, Action, useNavigation, showToast } from '@raycast/api';
import fs from 'fs';
import OpenAI from "openai";
import { API_KEYS } from './enums';
import Thread from './thread';
import instructions from '../instructions.json';

type Values = {
  assistant: string;
  prompt: string;
  instructions: string;
  files: string[];
  temperature: string;
};

type ParsedValues = {
  assistant: string;
  conversation: Array<{ role: 'user' | 'assistant' | 'system', content: string }>;
  instructions: string;
  files: string[];
  model: string;
  temperature: number;
  timestamp: number;
  assistantID: string;
  threadID: string;
};

const model = 'gpt-4o';

export default function Command() {
  const { push } = useNavigation();

  async function handleSubmit(values: Values) {
    const openai = new OpenAI({ apiKey: API_KEYS.OPENAI });
    const emptyThread = await openai.beta.threads.create();

    let parsedValues: ParsedValues = {
      assistant: values.assistant,
      conversation: [
        { role: 'system', content: instructions.text },
        { role: 'user', content: values.prompt }
      ],
      instructions: `${values.instructions}`,
      files: values.files.filter((file: any) => fs.existsSync(file) && fs.lstatSync(file).isFile()),
      // model: values.model,
      model: model,
      temperature: parseFloat(values.temperature),
      timestamp: Date.now(),
      assistantID: '',
      threadID: emptyThread.id,
    }

    console.log(parsedValues.threadID);
    showToast({ title: 'Submitted' });
    console.log(JSON.stringify(parsedValues));
    push(<Thread data={parsedValues} />)
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title='Submit' onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id='assistant' title='Assistant'>
        <Form.Dropdown.Item key='analyser' value='analyser' title='Document Analyser' />
        {/* <Form.Dropdown.Item key='coding' value='Your jobs is to help the user with his coding project' title='Coding' /> */}
      </Form.Dropdown>

      <Form.TextArea id='instructions' title='Instructions' placeholder='What do you want the assistant to do' />
      <Form.TextArea id='prompt' title='Prompt' placeholder='Describe your request here' enableMarkdown={true} />

      <Form.TextField id='temperature' title='Temperature' defaultValue='0.7' placeholder='0.7' />
      <Form.FilePicker id='files' allowMultipleSelection={true} />
    </Form>
  );
}
