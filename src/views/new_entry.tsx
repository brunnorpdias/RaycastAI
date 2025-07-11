import { Form, ActionPanel, Action, useNavigation, showToast, Toast } from "@raycast/api";
import * as Functions from '../utils/functions';
import Answer from './answer';
import assert from 'assert';
import { useEffect, useState } from "react";
import { type Data } from '../utils/models'
import { attachmentModels } from '../utils/models';

type Values = {
  prompt: string,
  attatchmentPaths: [string];
}


export default function NewEntry({ data, promptTimestamp }: { data: Data, promptTimestamp?: number }) {
  const { push } = useNavigation();
  const [initialPrompt, setInitialPrompt] = useState<string | null>(null);
  // const [inputMessage, setInputMessage] = useState<Data["messages"][number]>();

  useEffect(() => {
    if (promptTimestamp) {
      const message = data.messages.findLast(msg => msg.timestamp === promptTimestamp);
      if (message) {
        setInitialPrompt(message.content)
        // setInputMessage(message);
      }
    } else {
      setInitialPrompt('')
    }
    // setIsLoading(false)
  }, [promptTimestamp])

  async function handleSubmit(values: Values) {
    const timestamp: number = Date.now();
    const newMessage: Data["messages"][number] = {
      role: 'user',
      content: values.prompt,
      timestamp: timestamp
    };

    if (values.attatchmentPaths && values.attatchmentPaths?.length > 0) {
      const newFileInfos: Data["files"] = await Functions.ProcessFiles(values.attatchmentPaths, timestamp)
      data.files = [...data.files, ...newFileInfos]
    }


    if (promptTimestamp) {
      const messages: Data["messages"] = data.messages;
      const messageIndex: number = messages
        .findLastIndex(msg => msg.timestamp === promptTimestamp)
      assert(messageIndex !== undefined && messageIndex !== -1, 'Message timestamp didn\'t match')
      const truncMessages: Data["messages"] = messages.slice(0, messageIndex)
      const truncData: Data = {
        ...data,
        messages: [...truncMessages, newMessage],
      }

      // Confirm overwrite of conversation
      showToast({
        title: 'Overwrite conversation?', style: Toast.Style.Failure, primaryAction: {
          title: "Yes",
          onAction: async () => {
            await Functions.CacheChat(truncData);
            push(<Answer data={truncData} />)
          }
        }
      })
    } else {
      const newData: Data = {
        ...data,
        messages: [...data.messages, newMessage]
      }

      if (!data.tools?.includes('deepResearch')) {
        await Functions.CacheChat(newData);
        await Functions.BookmarkChat(newData, false);
      }

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

        {attachmentModels.includes(data.model) && (
          <Form.FilePicker id="attatchmentPaths" />
        )}

      </Form>
    );
  } else {
    return (
      <Form isLoading={true} >
        {/* <Form.TextArea id="prompt" defaultValue={''} title="Prompt" placeholder="Describe your request here" enableMarkdown={true} /> */}
      </Form>
    );
  }
}
