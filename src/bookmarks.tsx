import { Action, ActionPanel, Icon, List as RaycastList, LocalStorage, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import ChatHistory from "./history";
import { format as DateFormat } from "date-fns";

import { type Data } from "./form";
type Bookmarks = Array<{ title: string, data: Data }>;


export default function Bookmarks() {
  const { push } = useNavigation();
  const [bookmarks, setBookmarks] = useState<Bookmarks>();

  async function RetrieveStorage() {
    const stringData = await LocalStorage.getItem('bookmarks') as string;
    if (stringData && JSON.parse(stringData)) {
      setBookmarks(JSON.parse(stringData));
    }
  }

  useEffect(() => {
    RetrieveStorage();
  }, [])

  if (bookmarks) {
    return (
      <RaycastList>
        {bookmarks
          .filter(item => item.data.messages && item.data.messages.length > 0 && typeof item.data.messages.slice(-1)[0]?.id == 'number')
          .sort((a, b) => {
            const bTimestamp = b.data.timestamp;
            const aTimestamp = a.data.timestamp;
            return bTimestamp - aTimestamp
          })
          .map((item, index) => (
            <RaycastList.Item
              key={`${index}`}
              title={`${item.title}`}
              subtitle={DateFormat(item.data.timestamp, 'HH:mm:ss dd/MM/yy')}
              actions={
                <ActionPanel>
                  <Action
                    title="View messages"
                    icon={Icon.AppWindow}
                    onAction={() => {
                      // console.log(typeof item.data.messages);
                      push(<ChatHistory data={item.data} />)
                    }}
                  />
                  await LocalStorage.clear();
                  <Action
                    title="Delete Item"
                    icon={Icon.Trash}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    onAction={async () => {
                      const deleteID = item.data.timestamp;
                      const newBookmarks = bookmarks.filter(bookmark => bookmark.data.timestamp !== deleteID);
                      setBookmarks(newBookmarks);
                      LocalStorage.setItem('bookmarks', JSON.stringify(newBookmarks));
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
        <RaycastList.EmptyView title="No conversation data" description="Bookmark a conversation to see it here." />
      </RaycastList>
    );
  }
}

