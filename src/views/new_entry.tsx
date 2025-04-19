import { Form, ActionPanel, Action, useNavigation, showToast, Toast, Cache as RaycastCache } from "@raycast/api";
import Answer from './answer';
import { type Data } from "../utils/types";
import { useEffect, useState } from "react";

type Values = {
  prompt: string
}


export default function NewEntry({ data, promptTimestamp }: { data: Data, promptTimestamp?: number }) {
  const { push } = useNavigation();
  const [initialPrompt, setInitialPrompt] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState<Data["messages"][number]>();

  useEffect(() => {
    if (promptTimestamp) {
      const message = data.messages.findLast(msg => msg.timestamp === promptTimestamp);
      if (message) {
        setInitialPrompt(message.content)
        setInputMessage(message);
      }
    } else {
      setInitialPrompt('')
    }
    // setIsLoading(false)
  }, [promptTimestamp])

  async function handleSubmit(values: Values) {
    const lastMessage: Data["messages"][number] | undefined = data.messages.at(-1);
    const newMessage: Data["messages"][number] = { role: 'user', content: values.prompt, timestamp: Date.now() }

    if (promptTimestamp && lastMessage?.timestamp !== inputMessage?.timestamp) {
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
    } else {
      const newData: Data = {
        ...data,
        messages: [...data.messages, newMessage]
      }
      await Cache(newData);
      push(<Answer data={newData} />)
    }
  }

  if (initialPrompt !== null) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
          </ActionPanel>
        }
      >
        <Form.TextArea id="prompt" defaultValue={initialPrompt ?? 'nothing'} title="Prompt" placeholder="Describe your request here" enableMarkdown={true} />
      </Form>
    );
  } else {
    return (
      <Form isLoading={true} >
        {/* <Form.TextArea id="prompt" defaultValue={''} title="Prompt" placeholder="Describe your request here" enableMarkdown={true} /> */}
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
}
