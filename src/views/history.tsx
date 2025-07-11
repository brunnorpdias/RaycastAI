import { List as RaycastList, ActionPanel, Action, Icon, useNavigation } from "@raycast/api";
import NewEntry from "./new_entry";
import Answer from "./answer";
import { useEffect, useState } from "react";
import { type ChatSession, Role } from "../utils/models";

export default function ChatHistory({ chat }: { chat: ChatSession }) {
  const { push } = useNavigation();
  const [parsedChat, setParsedChat] = useState<ChatSession>();

  useEffect(() => {
    if (chat) {
      setParsedChat(chat)
    }
  }, [chat])

  if (parsedChat) {
    return (
      <RaycastList isShowingDetail>
        {chat.messages
          .map((message, index) => (
            <RaycastList.Item
              key={`#${index}`}
              title={message.content}
              subtitle={message.role}
              detail={
                <RaycastList.Item.Detail
                  markdown={message.content}
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title={message.role === Role.User ? 'Edit' : 'Open Message'}
                    icon={Icon.Text}
                    onAction={() => {
                      if (message.role === Role.User) {
                        push(<NewEntry chat={chat} promptTimestamp={message.timestamp} />)
                      } else {
                        push(<Answer chat={chat} msgTimestamp={message.timestamp} />)
                        // if (message.timestamp) {
                        // } else {
                        //   push(<Answer chat={chat} msgTimestamp={Number(message.id)} />)
                        // }
                      }
                    }}
                  />

                  <Action
                    title="New Entry"
                    icon={Icon.Plus}
                    onAction={() => {
                      push(<NewEntry chat={chat} />)
                    }}
                  />

                  <Action.CopyToClipboard
                    title="Copy"
                    icon={Icon.CopyClipboard}
                    content={message.content}
                    shortcut={{ modifiers: ['cmd'], key: 'c' }}
                  />

                </ActionPanel>
              }
            />
          ))}
      </RaycastList>
    );
  } else {
    return (
      <RaycastList>
        <RaycastList.EmptyView title="No conversation data" description="Start a new conversation to see it here." />
      </RaycastList>
    );
  }
}
