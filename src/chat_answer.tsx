import { Detail, showToast, Toast, useNavigation, ActionPanel, Action, Cache as RaycastCache, Icon, LocalStorage } from "@raycast/api";
import NewEntry from './chat_newentry';
import * as OpenAPI from './fetch/openAI';
import { useEffect, useState, useRef } from 'react';
import { APIHandler } from './chat_api_handler';

type Bookmarks = Array<{ title: string, data: Data }>;
import { type Data } from "./chat_form";
export type Status = 'idle' | 'streaming' | 'done' | 'reset';
export type StreamPipeline = (apiResponse: string, apiStatus: Status) => void;


// export default function Answer({ data }: { data: Data }, messageId?: number) {
export default function Answer({ data, messageId }: {
  data: Data;
  messageId?: number;
}) {
  const { push } = useNavigation();
  const hasRun = useRef(false);
  const [status, setStatus] = useState<Status>('idle');
  const [response, setResponse] = useState('');
  const [startTime, setStartTime] = useState(0);
  const [newData, setNewData] = useState<Data>(data);

  useEffect(() => {
    if (messageId) {
      OpenHistoricalMessage();
    }
    if (!hasRun.current) {
      APIHandler(data, streamPipeline)
      setStartTime(Date.now())
      hasRun.current = true;
    }
  }, [data])

  useEffect(() => {
    if (status === 'done') {
      SaveData();
      const duration: number = Math.round((Date.now() - startTime) / 100) / 10;
      showToast({ title: 'Done', message: `Streaming took ${duration}s to complete` });  // style add?
    }
  }, [status])

  const streamPipeline: StreamPipeline = (apiResponse: string, apiStatus: Status) => {
    setStatus(apiStatus);
    if (apiStatus !== 'reset') {
      setResponse((prevResponse) => prevResponse + apiResponse);
    } else {
      setResponse('')
    }
  };

  async function SaveData() {
    const finalData: Data = await NewData(data, response);
    setNewData(finalData);
    Cache(finalData);
    Bookmark(finalData, false);
  }

  async function OpenHistoricalMessage() {
    hasRun.current = true;
    const selected_message = data.messages.findLast(msg => msg.timestamp === messageId)
    if (selected_message) {
      let api_response: string;
      if (typeof selected_message.content === 'string') {
        api_response = selected_message.content;
      } else {
        api_response = selected_message.content.slice(-1)[0].text || '';
      }
      setResponse(api_response)
      setNewData(data)
    } else {
      showToast({ title: 'Error opening message', style: Toast.Style.Failure })
    }
  }

  return (
    <Detail
      markdown={response}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title='Copy Response'
            icon={Icon.Paragraph}
            content={response}
          />

          <Action
            title="New Entry"
            icon={Icon.Plus}
            onAction={() => {
              if (messageId) {
                const messageIndex: number = data.messages
                  .filter(msg => msg.role === 'assistant')
                  .findLastIndex(msg => msg.timestamp === messageId) || data.messages.length - 1
                const truncData: Data = { ...data, messages: data.messages.slice(0, messageIndex + 1) }
                push(<NewEntry data={truncData} />)
              } else {
                push(<NewEntry data={newData} />)
              }
            }}
          />

          <Action
            title="Bookmark"
            icon={Icon.Bookmark}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={async () => {
              Bookmark(data, true)
            }}
          />

          {/* <Action */}
          {/*   title="Summarise" */}
          {/*   icon={Icon.ShortParagraph} */}
          {/*   onAction={() => { */}
          {/*     hasRunRef.current = false; */}
          {/*     setResponse('') */}
          {/**/}
          {/*     const temp: Data = { */}
          {/*       ...newData, */}
          {/*       messages: [ */}
          {/*         ...newData.messages, */}
          {/*         { role: 'user', content: "Give a title for this conversation in a heading, then summarise the content on the conversation without mentioning that", timestamp: Date.now() } */}
          {/*       ] */}
          {/*     } */}
          {/*     push(<Chat data={temp} />) */}
          {/*   }} */}
          {/* /> */}

        </ActionPanel>
      }
    />
  )
}


// Helper Functions
async function NewData(data: Data, response: string) {
  let userMessage: Data["messages"][0] = data.messages.slice(-1)[0];
  let assistantMessage: Data["messages"][0];
  if (typeof userMessage.content === 'string') {
    assistantMessage = {
      role: 'assistant',
      content: response,
      timestamp: Date.now()
    };
  } else {
    assistantMessage = {
      role: 'assistant',
      content: [{ type: 'text', text: response }],
      timestamp: Date.now()
    };
  }
  const newData: Data = {
    ...data,
    messages: [...data.messages, assistantMessage],
  }
  return newData
}


async function Cache(data: Data) {
  const raycastCache = new RaycastCache();
  const cachedDataString = raycastCache.get('cachedData');
  let cachedData: Data[] = cachedDataString ? JSON.parse(cachedDataString) : [];
  if (cachedData.length > 0) {
    const filteredCache: Data[] = cachedData
      .filter(cache => cache.id !== data.id) // remove data if it's already cached
    const newList = [...filteredCache, data];
    const newCachedData: Data[] = newList
      .sort((a: Data, b: Data) => b.id - a.id)
      .slice(0, 30)
    raycastCache.set('cachedData', JSON.stringify(newCachedData));
  } else {
    const list = [data];
    raycastCache.set('cachedData', JSON.stringify(list));
  }
  showToast({ title: 'Cached', style: Toast.Style.Success });
}


async function Bookmark(data: Data, isManuallyBookmarked: boolean) {
  const stringBookmarks = await LocalStorage.getItem('bookmarks');
  if (typeof stringBookmarks !== 'string') return false;
  const bookmarks: Bookmarks = JSON.parse(stringBookmarks);
  const bookmarkIndex: number = bookmarks.findIndex(bookmark => bookmark.data.id === data.id);

  if (bookmarkIndex >= 0) {  // bookmark already exists
    const title = await OpenAPI.TitleConversation(data);
    if (typeof title !== 'string') return false;
    bookmarks[bookmarkIndex] = { title: title, data: data };
    LocalStorage.setItem('bookmarks', JSON.stringify(bookmarks));
    showToast({ title: 'Bookmark modified', style: Toast.Style.Success })
  } else if (isManuallyBookmarked) {
    const title = await OpenAPI.TitleConversation(data);
    if (typeof title !== 'string') return false;
    bookmarks.push({ title: title, data: data });
    LocalStorage.setItem('bookmarks', JSON.stringify(bookmarks));
    showToast({ title: 'Bookmarked', style: Toast.Style.Success })
  }
}
