import { Action, ActionPanel, Icon, List as RaycastList, Cache as RaycastCache, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
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

type CachedChats = Data[];

// type ParsedCacheChats = Array<{
//   type: 'chat' | 'assistant',
//   timestamp: number,
//   conversation: Array<{ role: 'user' | 'assistant', content: string }>,
//   stringData: string
// }>;


export default function Cache() {
  const { push } = useNavigation();
  const [cache, setCache] = useState<CachedChats>();

  useEffect(() => {
    const cache = new RaycastCache();
    const cachedChatsString = cache.get('cachedChats');
    const cachedChats: CachedChats = cachedChatsString ? JSON.parse(cachedChatsString) : [];

    // if (cachedChats) {
    //   const parsedCacheChats: ParsedCacheChats = cachedChats.map(chat => ({
    //     type: 'chat',
    //     timestamp: chat.id,
    //     conversation: chat.conversation.map(conversation => ({ role: conversation.role, content: conversation.content })),
    //     stringData: JSON.stringify(chat)
    //   }));
    //
    setCache(cachedChats);
    // }
  }, [])

  if (cache) {
    return (
      <RaycastList>
        {Object.values(cache)
          .reverse()
          .map((item, index) => (
            <RaycastList.Item
              key={`${index}`} //// CHANGE TO TIMESTAMP
              title={`${item.conversation[0].content}`}
              subtitle={new Date(item.id).toString()}
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
                  {/* await LocalStorage.clear(); */}
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


