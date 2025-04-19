import { List as RaycastList, ActionPanel, Action, Icon, useNavigation } from "@raycast/api";
import NewEntry from "./new_entry";
import Answer from "./answer";
import { useEffect, useState } from "react";
import { type Data } from "../utils/types";

export default function ChatHistory({ data }: { data: Data }) {
  const { push } = useNavigation();
  const [parsedData, setParsedData] = useState<Data>();

  useEffect(() => {
    if (data) {
      setParsedData(data)
    }
  }, [data])

  if (parsedData) {
    return (
      <RaycastList isShowingDetail>
        {data.messages
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
                    title={message.role === 'user' ? 'Edit' : 'Open Message'}
                    icon={Icon.Text}
                    onAction={() => {
                      if (message.role === 'user') {
                        push(<NewEntry data={data} promptTimestamp={message.timestamp} />)
                      } else {
                        // added if statements because of change in formatting of data, not necessary for new users
                        if (message.timestamp) {
                          push(<Answer data={data} msgTimestamp={message.timestamp} />)
                        } else {
                          push(<Answer data={data} msgTimestamp={Number(message.id)} />)
                        }
                      }
                    }}
                  />

                  <Action
                    title="New Entry"
                    icon={Icon.Plus}
                    onAction={() => {
                      push(<NewEntry data={data} />)
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
