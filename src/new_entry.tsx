import { Form, ActionPanel, Action, useNavigation } from "@raycast/api";
import Answer from './answer';
import { type Data } from "./form";

type Values = {
  prompt: string
}


export default function NewEntry({ data }: { data: Data }) {
  const { push } = useNavigation();

  function handleSubmit(values: Values) {
    const prompt = values.prompt;
    const lastMessage = data.messages.at(-1);
    let newMessage: Data["messages"][0];
    if (lastMessage && typeof lastMessage.content === 'string') {
      newMessage = { role: 'user', content: prompt, id: Date.now() };
    } else {
      newMessage = { role: 'user', content: [{ type: 'text', text: prompt }], id: Date.now() }
    }
    const newData: Data = {
      ...data,
      messages: [...data.messages, newMessage]
    }
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
