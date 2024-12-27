import { Action, ActionPanel, Icon, List as RaycastList, Cache as RaycastCache, LocalStorage, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { format as DateFormat } from "date-fns";
import Detail from "./detail";

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

// type ParsedCacheChats = Array<{
//   type: 'chat' | 'assistant',
//   timestamp: number,
//   conversation: Array<{ role: 'user' | 'assistant', content: string }>,
//   stringData: string
// }>;


export default function Cache() {
  const { push } = useNavigation();
  const [cache, setCache] = useState<DataList>();

  useEffect(() => {
    const raycastCache = new RaycastCache();
    const cachedChatsString = raycastCache.get('cachedChats');
    const cachedChats: DataList = cachedChatsString ? JSON.parse(cachedChatsString) : [];
    setCache(cachedChats);
  }, [])


  if (cache) {
    return (
      <RaycastList>
        {Object.values(cache)
          .sort((a, b) => b.conversation.slice(-1)[0].timestamp - a.conversation.slice(-1)[0].timestamp)
          .map((item, index) => (
            <RaycastList.Item
              key={`${index}`} //// CHANGE TO TIMESTAMP
              title={`${item.conversation[0].content}`}
              subtitle={DateFormat(item.conversation.slice(-1)[0].timestamp, 'HH:mm:ss dd/MM/yy')}
              actions={
                <ActionPanel>
                  <Action
                    title="View Conversation"
                    icon={Icon.AppWindow}
                    onAction={() => {
                      // console.log(typeof item.data.conversation);
                      push(<Detail data={item} />)
                    }}
                  />

                  <Action
                    title="Delete Item"
                    icon={Icon.Trash}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    onAction={() => {
                      const deleteID = item.id;
                      const newCache = cache.filter(conversation => conversation.id !== deleteID);
                      setCache(newCache);
                      const raycastCache = new RaycastCache();
                      raycastCache.set('cachedChats', JSON.stringify(newCache))
                    }}
                  />

                  <Action
                    title="Bookmark"
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={async () => {
                      // const filteredMessages = cache
                      //   .map(datum  => datum.conversation)
                      //   .flatMap(datum => datum.conversation)
                      //   .filter(conversation => conversation.role === 'user' || role === 'assistant')
                      //   .map(({ timestamp, ...rest }) => rest) as Messages;
                      //
                      // const title = await OpenAPI.TitleConversation(filteredMessages);
                      //
                      // await LocalStorage.setItem(
                      //   'bookmarks',
                      //   JSON.stringify(),
                      // );
                      // showToast({ title: 'Bookmarked' });
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


