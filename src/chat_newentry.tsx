import { Form, ActionPanel, Action, useNavigation } from "@raycast/api";
import Answer from './chat_answer';
import { type Data } from "./chat_form";

type Values = {
  prompt: string
}


export default function NewEntry({ data }: { data: Data }) {
  const { push } = useNavigation();

  function handleSubmit(values: Values) {
    const prompt = values.prompt;
    const newData: Data = {
      ...data,
      messages: [...data.messages, { role: 'user', content: prompt, timestamp: Date.now() }]
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
    >
      <Form.TextArea id="prompt" title="Prompt" placeholder="Describe your request here" enableMarkdown={true} />
    </Form>
  );
}
