import { Action, ActionPanel, Icon, List as RaycastList, Cache as RaycastCache, LocalStorage, useNavigation, showToast, Toast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { format as DateFormat } from "date-fns";
import ChatHistory from "./history";

import { type Data } from "../utils/types";
import * as Functions from "../utils/functions";

type Bookmark = { title: string, data: Data };
type RawItem = Data & { summary?: string };
type ListItem = {
  data: Data,
  key: number,
  title: string,
  markdown: string,
  provider: { name: string, iconDir: string },
  model: string,
  date: string,
  summary?: string,
  attachmentNames?: string[],
  tokenCount?: number
};

const apiToIcon = {
  'openai': { name: 'OpenAI', icon: '../assets/openai-logo.svg' },
  'deepmind': { name: 'Deep Mind', icon: '../assets/deepmind-icon.png' },
  'anthropic': { name: 'Anthropic', icon: '../assets/anthropic-icon.png' },
  'openrouter': { name: 'OpenRouter', icon: '../assets/open_router-logo.png' },
}


export default function SavedChats({ cacheOrBookmarks }: { cacheOrBookmarks: 'cache' | 'bookmarks' }) {
  const { push } = useNavigation();
  const [list, setList] = useState<ListItem[]>();

  useEffect(() => {
    LoadData();
  }, [cacheOrBookmarks]);

  async function LoadData() {
    let rawList: RawItem[];
    if (cacheOrBookmarks === 'cache') {
      const raycastCache = new RaycastCache();
      const stringCache = raycastCache.get('cachedData');
      rawList = stringCache ? JSON.parse(stringCache) : [];
    } else {
      const stringBookmarks = await LocalStorage.getItem('bookmarks') as string;
      const bookmarksData: Bookmark[] = stringBookmarks ? JSON.parse(stringBookmarks) : [];
      rawList = bookmarksData.map((bookmark: Bookmark) => ({
        ...bookmark.data,
        summary: bookmark.title
      }))
    }

    const optimisedList: ListItem[] = rawList
      .filter(item => item.messages.length > 0)
      .map(item => {
        try {
          return {
            data: item,
            key: item.timestamp,
            title: cacheOrBookmarks === 'cache' ?
              item.messages.at(0)?.content ?? '' :
              item.summary ?? 'No summary...',
            markdown: item.messages
              .slice(0, 2)
              .map(msg => msg.content)
              .join(`\n\r---\n\r---\n\r`),
            provider: { name: apiToIcon[item.api].name, iconDir: apiToIcon[item.api].icon },
            model: item.model,
            date: DateFormat(item.timestamp, 'HH:mm:ss dd/MM/yy'),
            summary: item.summary,
            attachmentNames: item.files.map(file => file.path.slice(file.path.lastIndexOf('/') + 1, file.path.lastIndexOf('.'))),
            tokenCount: item.messages
              .map(msg => msg.tokenCount)
              .filter(value => typeof value === 'number')
              .reduce((sum, value) => sum + value, 0)
          }
        } catch (err) {
          console.log(err)
          showToast({ title: 'Error displaying item(s)', style: Toast.Style.Failure })
        }
        return {
          data: item,
          key: item.timestamp,
          title: 'Error displaying',
          markdown: '...',
          provider: { name: apiToIcon[item.api].name, iconDir: apiToIcon[item.api].icon },
          model: '',
          date: DateFormat(item.timestamp, 'HH:mm:ss dd/MM/yy'),
        }
      })
    setList(optimisedList);
  }

  const memo = useMemo(() => {
    if (list) {
      return (
        list
          .map((listItem: ListItem) => (
            <RaycastList.Item
              key={listItem.key}
              title={listItem.title}
              detail={
                <RaycastList.Item.Detail
                  markdown={listItem.markdown}
                  metadata={
                    <RaycastList.Item.Detail.Metadata>
                      <RaycastList.Item.Detail.Metadata.Label title="Provider" text={listItem.provider.name} icon={listItem.provider.iconDir} />
                      <RaycastList.Item.Detail.Metadata.Label title="Model" text={listItem.model} />
                      <RaycastList.Item.Detail.Metadata.Label title="Date" text={listItem.date} />
                      {cacheOrBookmarks === 'bookmarks' && listItem.summary && (
                        <RaycastList.Item.Detail.Metadata.Label title="Summary" text={listItem.summary} />
                      )}
                      {listItem.attachmentNames && listItem.attachmentNames.length > 0 && (
                        <RaycastList.Item.Detail.Metadata.Label title="Attachments" text={listItem.attachmentNames.join(', ')} />
                      )}
                      {listItem.tokenCount && (
                        <RaycastList.Item.Detail.Metadata.Label title="Token count" text={`${listItem.tokenCount.toLocaleString()} tokens`} />
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
                      push(<ChatHistory data={listItem.data} />)
                    }}
                  />

                  <Action.CopyToClipboard
                    title="Copy Data"
                    icon={Icon.CopyClipboard}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                    content={JSON.stringify(listItem.data)}
                  />

                  {cacheOrBookmarks === 'cache' && (
                    <Action
                      title="Bookmark"
                      icon={Icon.Bookmark}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                      onAction={async () => {
                        Functions.Bookmark(listItem.data, true)
                      }}
                    />
                  )}

                  <Action
                    title="Delete Item"
                    icon={Icon.Trash}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    onAction={async () => {
                      const deleteID = listItem.data.timestamp;
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
      )
    }
  }, [list])

  return (
    <RaycastList isShowingDetail>
      {memo}
    </RaycastList>
  )
}
