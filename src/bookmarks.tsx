import { Action, ActionPanel, Icon, List as RaycastList, LocalStorage, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import Detail from "./detail";
import { format as DateFormat } from "date-fns";

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

type Bookmarks = Array<{ title: string, data: Data }>;


export default function Bookmarks() {
  const { push } = useNavigation();
  const [bookmarks, setBookmarks] = useState<Bookmarks>();

  async function RetrieveStorage() {
    const stringData = await LocalStorage.getItem('bookmarks') as string;
    if (stringData) {
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
          .sort((a, b) => b.data.conversation.slice(-1)[0].timestamp - a.data.conversation.slice(-1)[0].timestamp)
          .map((item, index) => (
            <RaycastList.Item
              key={`${index}`}
              title={`${item.title}`}
              subtitle={DateFormat(item.data.conversation.slice(-1)[0].timestamp, 'HH:mm:ss dd/MM/yy')}
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

