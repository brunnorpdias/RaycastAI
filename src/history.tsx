import { List as RaycastList, ActionPanel, Action, Icon, useNavigation, showToast, Toast } from "@raycast/api";
import NewEntry from "./new_entry";
import Answer from "./answer";
import { useEffect, useState } from "react";
import { type Data } from "./form";

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
              title={`${message.content}`}
              subtitle={`${message.role}`}
              detail={
                <RaycastList.Item.Detail markdown={message.content ? String(message.content) : "Not a string"} />
              }
              actions={
                <ActionPanel>
                  <Action
                    title="View message"
                    icon={Icon.Text}
                    onAction={() => {
                      if (message.role === 'assistant') {
                        // added if statements because of change in formatting of data, not necessary for new users
                        if (message.timestamp) {
                          push(<Answer data={data} msgTimestamp={message.timestamp} />)
                        } else {
                          push(<Answer data={data} msgTimestamp={Number(message.id)} />)
                        }
                      } else {
                        showToast({ title: 'Cannot open user message', style: Toast.Style.Failure })
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
                    content={message.content ? String(message.content) : "Not a string"}
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
