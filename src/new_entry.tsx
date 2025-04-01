import { Form, ActionPanel, Action, useNavigation, showToast, Toast, Cache as RaycastCache } from "@raycast/api";
import Answer from './answer';
import { type Data } from "./form";
import { useEffect, useState } from "react";

type Values = {
  prompt: string
}


export default function NewEntry({ data, promptTimestamp }: { data: Data, promptTimestamp?: number }) {
  const { push } = useNavigation();
  const [fieldText, setFieldText] = useState<string>('');

  useEffect(() => {
    const message = data.messages.filter(msg => msg.timestamp === promptTimestamp).at(0);
    if (message) {
      const msgPrompt = typeof message.content === 'string' ?
        message.content :
        message.content.filter(item => item.type === 'text').at(-1)?.text || 'Error to define prompt...'
      setFieldText(msgPrompt)
    }
  }, [promptTimestamp])


  //clean this up
  async function handleSubmit(values: Values) {
    const prompt = values.prompt;
    const newMessage: Data["messages"][0] = data.api === 'openai' ?
      { role: 'user', content: [{ type: 'input_text', text: prompt }], timestamp: Date.now() } :
      { role: 'user', content: prompt, timestamp: Date.now() }

    if (!promptTimestamp) {
      const newData: Data = {
        ...data,
        messages: [...data.messages, newMessage]
      }
      await Cache(newData);
      push(<Answer data={newData} />)
    } else {
      const messages: Data["messages"] = data.messages;
      const messageIndex: number = messages
        .findLastIndex(msg => msg.timestamp === promptTimestamp)
      const truncMessages: Data["messages"] = messageIndex > 1 ?
        messages.slice(0, messageIndex) :
        []
      const truncData: Data = {
        ...data,
        messages: [...truncMessages, newMessage]
      }
      // Confirm overwrite of conversation
      showToast({
        title: 'Overwrite conversation?', style: Toast.Style.Failure, primaryAction: {
          title: "Yes",
          onAction: async () => {
            await Cache(truncData);
            push(<Answer data={truncData} />)
          }
        }
      })
    }
  }


  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="prompt" defaultValue={fieldText} title="Prompt" placeholder="Describe your request here" enableMarkdown={true} />
    </Form>
  );
}

async function Cache(newData: Data) {
  const cache = new RaycastCache()
  const stringCache = cache.get('cachedData')
  let newCache: Data[];
  if (stringCache) {
    let oldCache: Data[] = JSON.parse(stringCache)
    oldCache = oldCache.filter(item => item.timestamp !== newData.timestamp)
    newCache = [newData, ...oldCache]
  } else {
    newCache = [newData]
  }
  cache.set('cachedData', JSON.stringify(newCache))
}
