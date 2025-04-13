import { Action, ActionPanel, Icon, List as RaycastList, Cache as RaycastCache, LocalStorage, useNavigation, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { format as DateFormat } from "date-fns";
import ChatHistory from "./history";

import { type Data } from "../utils/types";
import * as Functions from "../utils/functions";
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
    LoadData();
  }, [cacheOrBookmarks]);

  async function LoadData() {
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
            const aLastMsgTime = a.messages.map(msg => msg.timestamp).at(-1) || 0;
            const bLastMsgTime = b.messages.map(msg => msg.timestamp).at(-1) || 0;
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
                      .slice(0, 2)  // select only the first two (better performance)
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
                      {data.messages.some(msg => msg.tokenCount && msg.tokenCount > 0) && (
                        <RaycastList.Item.Detail.Metadata.Label title="Token count" text={`${data.messages
                          .map(msg => msg.tokenCount)
                          .filter(value => typeof value === 'number')
                          .reduce((sum, value) => sum + value, 0)
                          .toLocaleString()
                          } tokens`} />
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

                  <Action.CopyToClipboard
                    title="Copy Data"
                    icon={Icon.CopyClipboard}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                    content={JSON.stringify(data)}
                  // onCopy={() => JSON.stringify(data)}
                  />

                  {cacheOrBookmarks === 'cache' && (
                    <Action
                      title="Bookmark"
                      icon={Icon.Bookmark}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                      onAction={async () => {
                        Functions.Bookmark(data, true)
                      }}
                    />
                  )}

                  <Action
                    title="Delete Item"
                    icon={Icon.Trash}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    onAction={async () => {
                      const deleteID = data.timestamp;
                      if (cacheOrBookmarks === 'cache') {
                        const raycastCache = new RaycastCache();
                        const cachedString: string | undefined = raycastCache.get('cachedData');
                        const cache: Data[] = cachedString ? JSON.parse(cachedString) : []
                        const newCache = cache.filter(messages => messages.timestamp !== deleteID);
                        raycastCache.set('cachedData', JSON.stringify(newCache))
                        showToast({ title: 'Deleted', style: Toast.Style.Success })
                      } else if (cacheOrBookmarks === 'bookmarks') {
                        const stringBookmarks = await LocalStorage.getItem('bookmarks');
                        if (typeof stringBookmarks !== 'string') return;
                        const bookmarks: Bookmark[] = JSON.parse(stringBookmarks)
                        const newBookmarks = bookmarks.filter(bookmark => bookmark.data.timestamp !== deleteID)
                        LocalStorage.setItem('bookmarks', JSON.stringify(newBookmarks));
                        showToast({ title: 'Deleted', style: Toast.Style.Success })
                      }
                      LoadData()
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

