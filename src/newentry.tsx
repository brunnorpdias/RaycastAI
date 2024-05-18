import { Form, ActionPanel, Action, useNavigation, showToast } from "@raycast/api";
import Answer from './answer';

type Data = {
  conversation: Array<{ role: 'user' | 'assistant', content: string }>;
  api: string;
  model: string;
  // instructions: string;
  temperature: number;
  stream: boolean;
  timestamp: number;
};

type Values = {
  prompt: string
}

export default function NewEntry({ data }: { data: Data }, editPrompt: string) {
  const { push } = useNavigation();

  function handleSubmit(values: Values) {
    const prompt = values.prompt;
    const newData: Data = {
      ...data,
      conversation: [...data.conversation, { role: 'user', content: prompt }]
    }
    showToast({ title: "Submitted" });
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
      <Form.TextArea id="prompt" title="Prompt" placeholder="Describe your request here" enableMarkdown={true} />
    </Form>
  );
}
