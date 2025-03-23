import { Action, ActionPanel, Icon, List as RaycastList, LocalStorage, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import ChatHistory from "./views_history";
import { format as DateFormat } from "date-fns";

import { type Data } from "./chat_form";
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
          // .filter(item => item.data.messages && item.data.messages.length > 0 && typeof item.data.messages.slice(-1)[0]?.timestamp == 'number')
          .sort((a, b) => {
            const bTimestamp = b.data.id;
            const aTimestamp = a.data.id;
            return bTimestamp - aTimestamp
          }
          )
          .map((item, index) => (
            <RaycastList.Item
              key={`${index}`}
              title={`${item.title}`}
              subtitle={DateFormat(item.data.id, 'HH:mm:ss dd/MM/yy')}
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
                  {/* await LocalStorage.clear(); */}
                  <Action
                    title="Delete Item"
                    icon={Icon.Trash}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    onAction={async () => {
                      const deleteID = item.data.id;
                      const newBookmarks = bookmarks.filter(bookmark => bookmark.data.id !== deleteID);
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

