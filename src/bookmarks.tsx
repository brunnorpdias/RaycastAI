import { Action, ActionPanel, Icon, List as RaycastList, LocalStorage, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import List from "./list";

type Data = {
  conversation: Array<{ role: 'user' | 'assistant' | 'system', content: string }>;
  api: string;
  model: string;
  temperature: number;
  stream: boolean;
  timestamp: number;
  status: string;
};

type Item = {
  title: string,
  data: Data
}
type Bookmarks = {
  [id: string]: Item;
}

export default function Command() {
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
                      push(<List data={item.data} />)
                    }}
                  />
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
