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
    const lastMessage: Data["messages"][0] = data.messages.slice(-1)[0];
    let newMessage: Data["messages"][0];
    if (typeof lastMessage.content === 'string') {
      newMessage = { role: 'user', content: prompt, timestamp: Date.now() };
    } else {
      newMessage = { role: 'user', content: [{ type: 'text', text: prompt }], timestamp: Date.now() }
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
