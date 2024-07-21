import { List as RaycastList, ActionPanel, Action, Icon, useNavigation } from "@raycast/api";
import NewEntry from "./chat_newentry";
import { useEffect, useState } from "react";

type Data = {
  conversation: Array<{ role: 'user' | 'assistant' | 'system', content: string, timestamp: number }>;
  api: string;
  model: string;
  temperature: number;
  stream: boolean;
  timestamp: number;
};

export default function Detail({ data }: { data: Data }) {
  const { push } = useNavigation();
  const [newData, setNewData] = useState<Data>();

  useEffect(() => {
    if (data) {
      setNewData(data)
    }
  }, [data])

  if (newData) {
    return (
      <RaycastList isShowingDetail>
        {data.conversation
          .filter(item => item.role !== 'system')
          .map((item, index) => (
            <RaycastList.Item
              key={`#${index}`}
              title={`${item.content}`}
              subtitle={`${item.role}`}
              detail={
                <RaycastList.Item.Detail markdown={item.content} />
              }
              actions={
                <ActionPanel>
                  <Action
                    title="New Entry"
                    icon={Icon.Plus}
                    onAction={() => {
                      push(<NewEntry data={newData} />)
                    }}
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


