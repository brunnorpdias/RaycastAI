import { Action, ActionPanel, Icon, List as RaycastList, Cache as RaycastCache, LocalStorage, useNavigation, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { format as DateFormat } from "date-fns";
import ChatHistory from "./history";
import * as OpenAPI from "./fetch/openAI";

import { type Data } from "./utils/types";
type Bookmark = { title: string, data: Data };

const apiToIcon = {
  'openai': { name: 'OpenAI', icon: '../assets/openai-logo.svg' },
  'deepmind': { name: 'Deep Mind', icon: '../assets/deepmind-icon.png' },
  'anthropic': { name: 'Anthropic', icon: '../assets/anthropic-icon.png' },
  'openrouter': { name: 'OpenRouter', icon: '../assets/open_router-logo.png' },
  'perplexity': { name: 'Perplexity', icon: '../assets/perplexity-icon.png' },
  'grok': { name: 'Grok', icon: '../assets/grok-logo-icon.png' },
}


export default function SavedChats({ cacheOrBookmarks }: { cacheOrBookmarks: 'cache' | 'bookmarks' }) {
  const { push } = useNavigation();
  const [dataList, setDataList] = useState<Data[]>();

  useEffect(() => {
    loadData();
  }, [cacheOrBookmarks]);

  async function loadData() {
    if (cacheOrBookmarks === 'cache') {
      const raycastCache = new RaycastCache();
      const stringCache = raycastCache.get('cachedData');
      const cachedData: Data[] = stringCache ? JSON.parse(stringCache) : [];
      setDataList(cachedData);
    } else {
      const stringBookmarks = await LocalStorage.getItem('bookmarks') as string;
      const bookmarksData = stringBookmarks ? JSON.parse(stringBookmarks) : [];
      const dataList: Data[] = bookmarksData.map((item: Bookmark) => item.data)
      setDataList(dataList);
    }
  }


  if (dataList) {
    return (
      <RaycastList isShowingDetail>
        {dataList
          .filter(item => item.messages && item.messages.length > 0)
          .sort((a, b) => {
            const aLastMsgTime = a.messages.sort(msg => msg.timestamp).at(-1)?.timestamp || 0;
            const bLastMsgTime = b.messages.sort(msg => msg.timestamp).at(-1)?.timestamp || 0;
            return bLastMsgTime - aLastMsgTime;
          })
          .map((data: Data, index) => (

            <RaycastList.Item
              key={`${data.timestamp}`}
              title={`${//
                cacheOrBookmarks === 'cache' ?
                  typeof data.messages.at(0)?.content === 'string' ? data.messages[0].content : data.messages.at(0)?.content.at(0)?.text || '' :
                  ''
                }`}
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
                      <RaycastList.Item.Detail.Metadata.Label title="Attachments" text={data.attachments?.map(att => att.name).join(', ')} />
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

