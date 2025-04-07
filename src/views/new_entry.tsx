import { Form, ActionPanel, Action, useNavigation, showToast, Toast, Cache as RaycastCache } from "@raycast/api";
import Answer from './answer';
import { type Data } from "../utils/types";
import { useEffect, useState } from "react";

type Values = {
  prompt: string
}


export default function NewEntry({ data, promptTimestamp }: { data: Data, promptTimestamp?: number }) {
  const { push } = useNavigation();
  const [fieldText, setFieldText] = useState<string>('');
  const [inputMessage, setInputMessage] = useState<Data["messages"][number]>();
  // const [selectedModel, setSelectedModel] = useState<string>('');  // add model selector for new prompts

  useEffect(() => {
    const message = data.messages.findLast(msg => msg.timestamp === promptTimestamp);
    console.log(JSON.stringify(message))
    if (message) {
      const msgPrompt = typeof message.content === 'string' ?
        message.content :
        message.content.filter(item => item.type === 'input_text').at(0)?.text || 'Error to define prompt...'
      setFieldText(msgPrompt)
      setInputMessage(message);
    }
  }, [promptTimestamp])

  // useEffect(() => {
  //   setSelectedModel(data.model)
  // }, [data])


  async function handleSubmit(values: Values) {
    const lastMessage: Data["messages"][number] | undefined = data.messages.at(-1);
    const newMessage: Data["messages"][number] = data.api === 'openai' ?
      { role: 'user', content: [{ type: 'input_text', text: values.prompt }], timestamp: Date.now() } :
      { role: 'user', content: values.prompt, timestamp: Date.now() }

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


  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="prompt" value={fieldText} title="Prompt" placeholder="Describe your request here" enableMarkdown={true} />

      {/* {[ */}
      {/*   'claude-3-7-sonnet-latest', */}
      {/*   'gpt-4o', 'gpt-4o-mini', 'o1', 'gpt-4.5-preview', */}
      {/*   'gemini-2.0-flash', 'gemini-2.5-pro-exp-03-25' */}
      {/* ].includes(selectedModel) && ( */}
      {/*     <Form.FilePicker id="attatchmentPaths" /> */}
      {/*   )} */}

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
