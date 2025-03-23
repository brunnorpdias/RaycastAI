import { Action, ActionPanel, Icon, List as RaycastList, Cache as RaycastCache, LocalStorage, useNavigation, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { format as DateFormat } from "date-fns";
import ChatHistory from "./views_history";
import * as OpenAPI from "./fetch/openAI";

import { type Data } from "./chat_form";
type DataList = Data[];
type Bookmark = { title: string, data: Data };
type Bookmarks = Bookmark[];


export default function Cache() {
  const { push } = useNavigation();
  const [cache, setCache] = useState<DataList>();

  useEffect(() => {
    const raycastCache = new RaycastCache();
    const cachedDataString = raycastCache.get('cachedData');
    // Possibly problematic line that outputs the "[object]" when displaying the conversation name on cache
    const cachedData: DataList = cachedDataString ? JSON.parse(cachedDataString) : [];
    if (Array.isArray(cachedData) && Object(cachedData.slice(-1))) {
      setCache(cachedData);
    }
  }, [])


  if (cache && Object.values(cache)) {
    return (
      <RaycastList>
        {Object.values(cache)
          .filter(item => item.messages && item.messages.length > 0 && item.messages.slice(-1)[0]?.timestamp !== undefined)
          .sort((a, b) => {
            const aTimestamp = a.messages.slice(-1)[0]?.timestamp || 0;
            const bTimestamp = b.messages.slice(-1)[0]?.timestamp || 0;
            return bTimestamp - aTimestamp;
          })
          .map((cachedItem: Data) => (
            <RaycastList.Item
              key={`${cachedItem.id}`}
              title={`${cachedItem.messages[0]?.content || 'No content'}`}
              subtitle={DateFormat(cachedItem.messages.slice(-1)[0].timestamp || 0, 'HH:mm:ss dd/MM/yy')}
              actions={
                <ActionPanel>
                  <Action
                    title="View Conversation"
                    icon={Icon.AppWindow}
                    onAction={() => {
                      // console.log(JSON.stringify(cachedItem))
                      push(<ChatHistory data={cachedItem} />)
                    }}
                  />

                  <Action
                    title="Delete Item"
                    icon={Icon.Trash}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    onAction={() => {
                      const deleteID = cachedItem.id;
                      const newCache = cache.filter(messages => messages.id !== deleteID);
                      setCache(newCache);
                      const raycastCache = new RaycastCache();
                      raycastCache.set('cachedData', JSON.stringify(newCache))
                    }}
                  />

                  <Action
                    title="Bookmark"
                    icon={Icon.Bookmark}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={async () => {
                      const title = await OpenAPI.TitleConversation(cachedItem);
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
