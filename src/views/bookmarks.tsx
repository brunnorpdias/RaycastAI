import { Action, ActionPanel, Icon, List as RaycastList, LocalStorage, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import Detail from "./detail";
import { format as DateFormat } from "date-fns";
import { type Data } from "../chat/chat_form";

type Bookmarks = Array<{ title: string, data: Data }>;


export default function Bookmarks() {
  const { push } = useNavigation();
  const [bookmarks, setBookmarks] = useState<Bookmarks>();

  async function RetrieveStorage() {
    const stringData = await LocalStorage.getItem('bookmarks') as string;
    if (stringData) {
      setBookmarks(JSON.parse(stringData));
    }
    // else statement
  }

  useEffect(() => {
    RetrieveStorage();
  }, [])

  if (bookmarks) {
    return (
      <RaycastList>
        {bookmarks
          .sort((a, b) => b.data.messages.slice(-1)[0].timestamp - a.data.messages.slice(-1)[0].timestamp)
          .map((item, index) => (
            <RaycastList.Item
              key={`${index}`}
              title={`${item.title}`}
              subtitle={DateFormat(item.data.messages.slice(-1)[0].timestamp, 'HH:mm:ss dd/MM/yy')}
              actions={
                <ActionPanel>
                  <Action
                    title="View messages"
                    icon={Icon.AppWindow}
                    onAction={() => {
                      // console.log(typeof item.data.messages);
                      push(<Detail data={item.data} />)
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

