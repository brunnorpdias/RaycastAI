import { Action, ActionPanel, Icon, List as RaycastList, Cache as RaycastCache, LocalStorage, useNavigation, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { format as DateFormat } from "date-fns";
import ChatHistory from "./history";
import * as OpenAPI from "./fetch/openAI";

import { type Data } from "./utils/types";
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
          .filter(item => item.messages && item.messages.length > 0)
          .sort((a, b) => {
            const aLastMsgTime = a.messages.sort(msg => msg.timestamp).at(-1)?.timestamp || 0;
            const bLastMsgTime = b.messages.sort(msg => msg.timestamp).at(-1)?.timestamp || 0;
            return bLastMsgTime - aLastMsgTime;
          })
          .map((cachedItem: Data) => (
            <RaycastList.Item
              key={`${cachedItem.timestamp}`}
              title={`${ //
                typeof cachedItem.messages.at(0)?.content === 'string' ?
                  cachedItem.messages[0].content :
                  Array.isArray(cachedItem.messages[0].content) ?
                    cachedItem.messages[0].content[0].text || '' :
                    ''
                }`}
              subtitle={DateFormat(cachedItem.timestamp || 0, 'HH:mm:ss dd/MM/yy')}
              actions={
                <ActionPanel>
                  <Action
                    title="View Conversation"
                    icon={Icon.AppWindow}
                    onAction={() => {
                      push(<ChatHistory data={cachedItem} />)
                    }}
                  />

                  <Action
                    title="Delete Item"
                    icon={Icon.Trash}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    onAction={() => {
                      const deleteID = cachedItem.timestamp;
                      const newCache = cache.filter(messages => messages.timestamp !== deleteID);
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
                        showToast({ title: 'Could not create a title to the conversation', style: Toast.Style.Failure })
                        return
                      }
                      const bookmarksString = await LocalStorage.getItem("bookmarks")
                      let newBookmarks: Bookmarks;
                      if (typeof (bookmarksString) == 'string') {
                        const bookmarks: Bookmarks = JSON.parse(bookmarksString)
                        const filteredBookmarks = bookmarks.filter(bm => bm.data.timestamp !== cachedItem.timestamp)
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
