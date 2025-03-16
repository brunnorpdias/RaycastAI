import { List as RaycastList, ActionPanel, Action, Icon, useNavigation } from "@raycast/api";
import NewEntry from "./chat_newentry";
import Answer from "./chat_answer";
import { useEffect, useState } from "react";
import { type Data } from "./chat_form";

export default function Detail({ data }: { data: Data }) {
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
          .map((item, index) => (
            <RaycastList.Item
              key={`#${index}`}
              title={`${item.content}`}
              subtitle={`${item.role}`}
              detail={
                <RaycastList.Item.Detail markdown={item.content ? String(item.content) : "Not a string"} />
              }
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy"
                    icon={Icon.CopyClipboard}
                    content={item.content ? String(item.content) : "Not a string"}
                  />

                  <Action
                    title="New Entry"
                    icon={Icon.Plus}
                    onAction={() => {
                      push(<NewEntry data={data} />)
                    }}
                  />


                  {/* <Action */}
                  {/*   title="View message" */}
                  {/*   icon={Icon.Text} */}
                  {/*   onAction={() => { */}
                  {/*     push(<Answer data={data} />) */}
                  {/*   }} */}
                  {/* /> */}
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


