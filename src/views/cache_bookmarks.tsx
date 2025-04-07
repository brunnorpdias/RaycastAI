import { Action, ActionPanel, Icon, List as RaycastList, Cache as RaycastCache, LocalStorage, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { format as DateFormat } from "date-fns";
import ChatHistory from "./history";

import { type Data } from "../utils/types";
type Bookmark = { title: string, data: Data };
type ListItem = Data & { summary?: string };

const apiToIcon = {
  'openai': { name: 'OpenAI', icon: '../assets/openai-logo.svg' },
  'deepmind': { name: 'Deep Mind', icon: '../assets/deepmind-icon.png' },
  'anthropic': { name: 'Anthropic', icon: '../assets/anthropic-icon.png' },
  'openrouter': { name: 'OpenRouter', icon: '../assets/open_router-logo.png' },
}


export default function SavedChats({ cacheOrBookmarks }: { cacheOrBookmarks: 'cache' | 'bookmarks' }) {
  const { push } = useNavigation();
  const [listItem, setListItem] = useState<ListItem[]>();

  useEffect(() => {
    loadData();
  }, [cacheOrBookmarks]);

  async function loadData() {
    if (cacheOrBookmarks === 'cache') {
      const raycastCache = new RaycastCache();
      const stringCache = raycastCache.get('cachedData');
      const cachedData: ListItem[] = stringCache ? JSON.parse(stringCache) : [];
      setListItem(cachedData);
    } else {
      const stringBookmarks = await LocalStorage.getItem('bookmarks') as string;
      const bookmarksData: Bookmark[] = stringBookmarks ? JSON.parse(stringBookmarks) : [];
      const dataList: ListItem[] = bookmarksData.map((bookmark: Bookmark) => ({
        ...bookmark.data,
        summary: bookmark.title
      }))
      setListItem(dataList);
    }
  }


  if (listItem) {
    return (
      <RaycastList isShowingDetail>
        {listItem
          .filter(item => item.messages && item.messages.length > 0)
          .sort((a, b) => {
            const aLastMsgTime = a.messages.sort(msg => msg.timestamp).at(-1)?.timestamp || 0;
            const bLastMsgTime = b.messages.sort(msg => msg.timestamp).at(-1)?.timestamp || 0;
            return bLastMsgTime - aLastMsgTime;
          })
          .map((data: ListItem) => (

            <RaycastList.Item
              key={`${data.timestamp}`}
              title={
                cacheOrBookmarks === 'cache' ?
                  Array.isArray(data.messages[0].content) ? data.messages[0].content[0].text || 'Empty array...' : data.messages[0].content :
                  data.summary || 'No summary...'
              }
              detail={
                <RaycastList.Item.Detail
                  markdown={
                    data.messages
                      .map(msg => typeof msg.content === 'string' ? msg.content : msg.content.at(0)?.text || '')
                      .join(`\n\r---\n\r---\n\r`)
                  }
                  metadata={
                    <RaycastList.Item.Detail.Metadata>
                      <RaycastList.Item.Detail.Metadata.Label title="Provider" text={apiToIcon[data.api].name} icon={apiToIcon[data.api].icon} />
                      <RaycastList.Item.Detail.Metadata.Label title="Model" text={data.model} />
                      <RaycastList.Item.Detail.Metadata.Label title="Date" text={DateFormat(data.timestamp, 'HH:mm:ss dd/MM/yy')} />
                      {cacheOrBookmarks === 'bookmarks' && data.summary && (
                        <RaycastList.Item.Detail.Metadata.Label title="Summary" text={data.summary} />
                      )}
                      {data.attachments && data.attachments.length > 0 && (
                        <RaycastList.Item.Detail.Metadata.Label title="Attachments" text={data.attachments?.map(att => att.name).join(', ')} />
                      )}
                    </RaycastList.Item.Detail.Metadata>
                  }
                />
              }

              actions={
                <ActionPanel>
                  <Action
                    title="View Conversation"
                    icon={Icon.AppWindow}
                    onAction={() => {
                      push(<ChatHistory data={data} />)
                    }}
                  />

                  <Action
                    title="Delete Item"
                    icon={Icon.Trash}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    onAction={() => {
                      // const deleteID = data.timestamp;
                      // const newCache = cache.filter(messages => messages.timestamp !== deleteID);
                      // setCache(newCache);
                      // const raycastCache = new RaycastCache();
                      // raycastCache.set('cachedData', JSON.stringify(newCache))
                    }}
                  />

                  {/* <Action */}
                  {/*   title="Bookmark" */}
                  {/*   icon={Icon.Bookmark} */}
                  {/*   shortcut={{ modifiers: ["cmd"], key: "d" }} */}
                  {/*   onAction={async () => { */}
                  {/*     const title = await OpenAPI.TitleConversation(data); */}
                  {/*     let newBookmark: Bookmark; */}
                  {/*     if (title) { */}
                  {/*       newBookmark = { title: title, data: data }; */}
                  {/*     } else { */}
                  {/*       showToast({ title: 'Could not create a title to the conversation', style: Toast.Style.Failure }) */}
                  {/*       return */}
                  {/*     } */}
                  {/*     const bookmarksString = await LocalStorage.getItem("bookmarks") */}
                  {/*     let newBookmarks: Bookmarks; */}
                  {/*     if (typeof (bookmarksString) == 'string') { */}
                  {/*       const bookmarks: Bookmarks = JSON.parse(bookmarksString) */}
                  {/*       const filteredBookmarks = bookmarks.filter(bm => bm.data.timestamp !== data.timestamp) */}
                  {/*       newBookmarks = [...filteredBookmarks, newBookmark] */}
                  {/*     } else { */}
                  {/*       newBookmarks = [newBookmark] */}
                  {/*     } */}
                  {/*     await LocalStorage.setItem( */}
                  {/*       'bookmarks', */}
                  {/*       JSON.stringify(newBookmarks) */}
                  {/*     ) */}
                  {/*     showToast({ title: 'Bookmarked' }); */}
                  {/*   }} */}
                  {/* /> */}

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

