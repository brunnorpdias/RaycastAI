import { Form, ActionPanel, Action, useNavigation, showToast } from "@raycast/api";
import Answer from './chat_answer';

type Data = {
  conversation: Array<{ role: 'user' | 'assistant' | 'system', content: string, timestamp: number }>;
  api: string;
  model: string;
  temperature: number;
  stream: boolean;
  timestamp: number;
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
      conversation: [...data.conversation, { role: 'user', content: prompt, timestamp: Date.now() }]
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
