import { Action, ActionPanel, Icon, List as RaycastList, LocalStorage, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import Detail from "./detail";

type Data = {
  id: number;
  temperature: number;
  conversation: Array<{ role: 'user' | 'assistant', content: string, timestamp: number }>;
  model: string;
  api?: string;
  systemMessage?: string;
  instructions?: string;
  stream?: boolean;
  assistantID?: string;
  threadID?: string;
  runID?: string;
  attachments?: Array<{ file_id: string, tools: Array<{ type: 'code_interpreter' | 'file_search' }> }>;
};

type Item = {
  title: string,
  data: Data
}

type Bookmarks = {
  [id: string]: Item;
}

export default function Bookmarks() {
  const { push } = useNavigation();
  const [bookmarks, setBookmarks] = useState<Bookmarks>();

  useEffect(() => {
    async function RetrieveStorage() {
      const temp = await LocalStorage.allItems();
      // console.log(temp)
      if (temp) {
        let parsedBookmarks: Bookmarks = {};
        for (const key of Object.keys(temp)) {
          // setBookmarks(JSON.parse(temp));
          const parsedItems: Item = JSON.parse(temp[key]);
          // console.log(parsedItems)
          parsedBookmarks[key] = {
            title: parsedItems.title,
            data: parsedItems.data
          }
        }
        setBookmarks(parsedBookmarks);
        // console.log(JSON.stringify(parsedBookmarks));
      }
    }

    RetrieveStorage();
  }, [])

  if (bookmarks) {
    return (
      <RaycastList>
        {Object.values(bookmarks)
          .map((item: Item, index) => (
            <RaycastList.Item
              key={`${index}`}
              title={`${item.title}`}
              actions={
                <ActionPanel>
                  <Action
                    title="View Conversation"
                    icon={Icon.AppWindow}
                    onAction={() => {
                      // console.log(typeof item.data.conversation);
                      push(<Detail data={item.data} />)
                    }}
                  />
                  {/* await LocalStorage.clear(); */}
                </ActionPanel>
              }
            />
          ))
        }
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

