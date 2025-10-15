import { Form, ActionPanel, Action, useNavigation, showToast, Toast } from "@raycast/api";
import * as Functions from "../utils/functions";
import Answer from "./answer";
import assert from "assert";
import { useEffect, useState } from "react";
import { type ChatSession, Role } from "../utils/models";
import { attachmentModels } from "../utils/models";

type Values = {
  prompt: string;
  attatchmentPaths: string[];
};

export default function NewEntry({ chat, promptTimestamp }: { chat: ChatSession; promptTimestamp?: number }) {
  const { push } = useNavigation();
  const [initialPrompt, setInitialPrompt] = useState<string | null>(null);
  // const [inputMessage, setInputMessage] = useState<ChatSession["messages"][number]>();

  useEffect(() => {
    if (promptTimestamp) {
      const message = chat.messages.findLast((msg) => msg.timestamp === promptTimestamp);
      if (message) {
        assert(message.content, "Content not found");
        setInitialPrompt(message.content);
        // setInputMessage(message);
      }
    } else {
      setInitialPrompt("");
    }
    // setIsLoading(false)
  }, [promptTimestamp]);

  async function handleSubmit(values: Values) {
    const timestamp: number = Date.now();
    const newMessage: ChatSession["messages"][number] = {
      role: Role.User,
      content: values.prompt,
      timestamp: timestamp,
    };

    if (values.attatchmentPaths && values.attatchmentPaths?.length > 0) {
      const newFileInfos: ChatSession["files"] = await Functions.ProcessFiles(values.attatchmentPaths, timestamp);
      chat.files = [...chat.files, ...newFileInfos];
    }

    if (promptTimestamp) {
      const messages: ChatSession["messages"] = chat.messages;
      const messageIndex: number = messages.findLastIndex((msg) => msg.timestamp === promptTimestamp);
      assert(messageIndex !== undefined && messageIndex !== -1, "Message timestamp didn't match");
      const truncMessages: ChatSession["messages"] = messages.slice(0, messageIndex);
      const truncChat: ChatSession = {
        ...chat,
        messages: [...truncMessages, newMessage],
      };

      // Confirm overwrite of conversation
      showToast({
        title: "Overwrite conversation?",
        style: Toast.Style.Failure,
        primaryAction: {
          title: "Yes",
          onAction: async () => {
            await Functions.CacheChat(truncChat);
            push(<Answer chat={truncChat} />);
          },
        },
      });
    } else {
      const newChat: ChatSession = {
        ...chat,
        messages: [...chat.messages, newMessage],
      };

      await Functions.CacheChat(newChat);
      // await Functions.BookmarkChat(newChat, false);  // too many title creations

      push(<Answer chat={newChat} />);
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
        <Form.TextArea
          id="prompt"
          defaultValue={initialPrompt ?? "nothing"}
          title="Prompt"
          placeholder="Describe your request here"
          enableMarkdown={true}
        />

        {attachmentModels.includes(chat.model) && <Form.FilePicker id="attatchmentPaths" />}
      </Form>
    );
  } else {
    return (
      <Form isLoading={true}>
        {/* <Form.TextArea id="prompt" defaultValue={''} title="Prompt" placeholder="Describe your request here" enableMarkdown={true} /> */}
      </Form>
    );
  }
}
