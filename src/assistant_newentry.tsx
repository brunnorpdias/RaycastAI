import { Form, ActionPanel, Action, useNavigation, showToast } from "@raycast/api";
import Answer from './assistant_answer';

type Data = {
  model: string;
  instructions: string;
  conversation: Array<{ role: 'user' | 'assistant', content: string }>;
  temperature: number;
  timestamp: number;
  assistantID: string;
  threadID: string;
  runID: string;
  attachments?: Array<{ file_id: string, tools: Array<{ type: 'code_interpreter' | 'file_search' }> }>;
};

type Values = {
  prompt: string
}

export default function NewEntry({ data }: { data: Data }) {
  const { push } = useNavigation();

  function handleSubmit(values: Values) {
    const prompt = values.prompt;
    const newData: Data = {
      ...data,
      conversation: [...data.conversation, { role: 'user', content: prompt }]
    }
    // showToast({ title: "Submitted" });
    push(<Answer data={newData} />)
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    // enableDrafts={true}
    >
      <Form.TextArea
        id="prompt" title="Prompt" placeholder="Describe your request here" enableMarkdown={true} />
    </Form>
  );
}

