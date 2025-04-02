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
  // const [selectedModel, setSelectedModel] = useState<string>('');  // add model selector for new prompts

  useEffect(() => {
    console.log(promptTimestamp)
    const message = data.messages.filter(msg => msg.timestamp === promptTimestamp).at(0);
    if (message) {
      console.log(JSON.stringify(message))
      const msgPrompt = typeof message.content === 'string' ?
        message.content :
        message.content.filter(item => item.type === 'text').at(-1)?.text || 'Error to define prompt...'
      setFieldText(msgPrompt)
    }
  }, [promptTimestamp])

  // useEffect(() => {
  //   setSelectedModel(data.model)
  // }, [data])

  //clean this up
  async function handleSubmit(values: Values) {
    const prompt = values.prompt;
    const lastMessage = data.messages.at(-1);
    if (!promptTimestamp) {
      let newMessage: Data["messages"][0];
      if (lastMessage && typeof lastMessage.content === 'string') {
        newMessage = { role: 'user', content: prompt, timestamp: Date.now() };
      } else {
        newMessage = { role: 'user', content: [{ type: 'text', text: prompt }], timestamp: Date.now() }
      }
      const newData: Data = {
        ...data,
        messages: [...data.messages, newMessage]
      }
      Cache(data);
      push(<Answer data={newData} />)
    } else {
      const messages: Data["messages"] = data.messages;
      const messageIndex: number = messages
        .findLastIndex(msg => msg.timestamp === promptTimestamp)
      const truncMessages: Data["messages"] = messageIndex > 1 ?
        messages.slice(0, messageIndex) :
        []
      let newMessage: Data["messages"][0];
      if (lastMessage && typeof lastMessage.content === 'string') {
        newMessage = { role: 'user', content: prompt, timestamp: Date.now() };
      } else {
        newMessage = { role: 'user', content: [{ type: 'text', text: prompt }], timestamp: Date.now() }
      }
      const truncData: Data = {
        ...data,
        messages: [...truncMessages, newMessage]
      }
      // Confirm overwrite of conversation
      showToast({
        title: 'Overwrite conversation?', style: Toast.Style.Failure, primaryAction: {
          title: "Yes",
          onAction: () => {
            Cache(data);
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

function Cache(data: Data) {
  // const cache = new RaycastCache()
  // const stringCache = cache.get('cachedData') || ''
  // const newCache: Data[] = JSON.parse(stringCache)
  // newCache.push(data)
  // cache.set('cachedData', JSON.stringify(newCache))
}
