import { Detail, showToast, Toast, useNavigation, ActionPanel, Action, Cache as RaycastCache, Icon, LocalStorage } from "@raycast/api";
import NewEntry from './new_entry';
import * as OpenAPI from './fetch/openAI';
import { useEffect, useRef, useState } from 'react';
import { APIHandler } from './api_handler';

type Bookmarks = Array<{ title: string, data: Data }>;
import { type Data } from "./form";
export type Status = 'idle' | 'streaming' | 'done' | 'reset';
export type StreamPipeline = (apiResponse: string, apiStatus: Status, msgID?: string) => void;


export default function Answer({ data, msgTimestamp }: {
  data: Data;
  msgTimestamp?: number;
}) {
  const { push } = useNavigation();
  const hasRun = useRef(false);
  const [status, setStatus] = useState<Status>('idle');
  const [response, setResponse] = useState('');
  const [startTime, setStartTime] = useState(0);
  const [newData, setNewData] = useState<Data>(data);
  const [msgID, setMsgId] = useState<string | undefined>();

  useEffect(() => {
    if (msgTimestamp) {
      OpenHistoricalMessage(data, setResponse, setNewData, msgTimestamp);
    } else if (!hasRun.current) {
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

  const streamPipeline: StreamPipeline = (apiResponse: string, apiStatus: Status, messageId?: string) => {
    setStatus(apiStatus);
    if (apiStatus !== 'reset') {
      setResponse((prevResponse) => prevResponse + apiResponse);
    } else {
      setResponse('')
    }
    if (messageId) {
      setMsgId(messageId)
    }
  };

  async function SaveData() {
    const finalData: Data = await NewData(data, response, msgID);
    setNewData(finalData);
    Cache(finalData);
    Bookmark(finalData, false);
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
              CreateNewEntry(data, newData, push, msgTimestamp)
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

        </ActionPanel>
      }
    />
  )
}


//  Helper Functions  //
async function NewData(data: Data, response: string, msgId?: string) {
  let userMessage = data.messages.at(-1);
  let assistantMessage: Data["messages"][0];
  if (userMessage && typeof userMessage.content === 'string') {
    assistantMessage = {
      role: 'assistant',
      content: response,
      timestamp: Date.now(),
    };
  } else {
    assistantMessage = {
      role: 'assistant',
      content: [{ type: 'text', text: response }],
      timestamp: Date.now(),
    };
  }
  if (msgId) {
    assistantMessage.id = msgId
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
      .filter(cache => cache.timestamp !== data.timestamp) // remove data if it's already cached
    const newList = [...filteredCache, data];
    const newCachedData: Data[] = newList
      .sort((a: Data, b: Data) => b.timestamp - a.timestamp)
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
  const bookmarkIndex: number = bookmarks.findIndex(bookmark => bookmark.data.timestamp === data.timestamp);

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


function CreateNewEntry(data: Data, newData: Data, push: Function, msgTimestamp?: number) {
  // is this a cached or bookmarked chat?
  if (msgTimestamp) {
    const messageIndex: number = data.messages
      .findLastIndex(msg => msg.timestamp === msgTimestamp) || data.messages.length - 1
    const truncData: Data = { ...data, messages: data.messages.slice(0, messageIndex + 1) }
    // Confirm overwrite of conversation
    showToast({
      title: 'Overwrite conversation?', style: Toast.Style.Failure, primaryAction: {
        title: "Yes",
        onAction: () => { push(<NewEntry data={truncData} />) }
      }
    })
  } else {
    push(<NewEntry data={newData} />)
  }
}


async function OpenHistoricalMessage(data: Data, setResponse: Function, setNewData: Function, msgTimestamp: number) {
  // Changed from id to timestamp, later added id separately, on the future remove the if condition, unnecessary for new users
  let selected_message = data.messages.findLast(msg =>
    msg.timestamp ?
      msg.timestamp === msgTimestamp :
      Number(msg.id) === msgTimestamp
  )
  if (selected_message) {
    let api_response: string;
    if (typeof selected_message.content === 'string') {
      api_response = selected_message.content;
    } else {
      api_response = selected_message.content.at(-1)?.text || '';
    }
    setResponse(api_response)
    setNewData(data)
  } else {
    showToast({ title: 'Error opening message', style: Toast.Style.Failure })
  }
}
