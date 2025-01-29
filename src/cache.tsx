import { Action, ActionPanel, Icon, List as RaycastList, Cache as RaycastCache, LocalStorage, useNavigation, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { format as DateFormat } from "date-fns";
import Detail from "./detail";
import * as OpenAPI from "./fetch/openAI";

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

type DataList = Data[];

type Bookmark = { title: string, data: Data };
type Bookmarks = Bookmark[];

// type ParsedCacheChats = Array<{
//   type: 'chat' | 'assistant',
//   timestamp: number,
//   conversation: Array<{ role: 'user' | 'assistant', content: string }>,
//   stringData: string
// }>;


export default function Cache() {
  const { push } = useNavigation();
  const [cache, getCache] = useState<DataList>();

  useEffect(() => {
    const raycastCache = new RaycastCache();
    const cachedChatsString = raycastCache.get('cachedChats');
    const cachedChats: DataList = cachedChatsString ? JSON.parse(cachedChatsString) : [];
    getCache(cachedChats);
  }, [])


  if (cache) {
    return (
      <RaycastList>
        {Object.values(cache)
          .sort((a, b) => b.conversation.slice(-1)[0].timestamp - a.conversation.slice(-1)[0].timestamp)
          .map((cachedItem: Data, cacheIndex) => (
            <RaycastList.Item
              key={`${cacheIndex}`} //// CHANGE TO TIMESTAMP
              title={`${cachedItem.conversation[0].content}`}
              subtitle={DateFormat(cachedItem.conversation.slice(-1)[0].timestamp, 'HH:mm:ss dd/MM/yy')}
              actions={
                <ActionPanel>
                  <Action
                    title="View Conversation"
                    icon={Icon.AppWindow}
                    onAction={() => {
                      // console.log(typeof cachedItem.data.conversation);
                      push(<Detail data={cachedItem} />)
                    }}
                  />

                  <Action
                    title="Delete Item"
                    icon={Icon.Trash}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    onAction={() => {
                      const deleteID = cachedItem.id;
                      const newCache = cache.filter(conversation => conversation.id !== deleteID);
                      getCache(newCache);
                      const raycastCache = new RaycastCache();
                      raycastCache.set('cachedChats', JSON.stringify(newCache))
                    }}
                  />

                  <Action
                    title="Bookmark"
                    icon={Icon.Bookmark}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={async () => {
                      const title = await OpenAPI.TitleConversation(cachedItem.conversation);
                      let newBookmark: Bookmark;
                      if (title) {
                        newBookmark = { title: title, data: cachedItem };
                      } else {
                        console.log('Could not create a title to the conversation')
                        return
                      }

                      const bookmarksString = await LocalStorage.getItem("bookmarks")
                      let newBookmarks: Bookmarks;

                      if (typeof (bookmarksString) == 'string') {
                        const bookmarks: Bookmarks = JSON.parse(bookmarksString)
                        const filteredBookmarks = bookmarks.filter(bm => bm.data.id !== cachedItem.id)
                        console.log(JSON.stringify(filteredBookmarks))
                        newBookmarks = [...filteredBookmarks, newBookmark]
                      } else {
                        newBookmarks = [newBookmark]
                      }

                      await LocalStorage.setItem(
                        'bookmarks',
                        JSON.stringify(newBookmarks)
                      )
                      showToast({ title: 'Bookmarked' });
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


