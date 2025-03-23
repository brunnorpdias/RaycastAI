import { Detail, showToast, Toast, useNavigation, ActionPanel, Action, Cache, Icon, LocalStorage } from "@raycast/api";
import NewEntry from './chat_newentry';
import * as OpenAPI from './fetch/openAI';
import { useEffect, useState, useRef } from 'react';
import { APIHandler } from './chat_api_handler';

type Bookmarks = Array<{ title: string, data: Data }>;
import { type Data } from "./chat_form";
export type Status = 'idle' | 'streaming' | 'done' | 'reset';
export type StreamPipeline = (apiResponse: string, apiStatus: Status) => void;


export default function AnswerView({ data }: { data: Data }) {
  const hasRun = useRef(false);
  const { push } = useNavigation();
  const [status, setStatus] = useState<Status>('idle');
  const [response, setResponse] = useState('');
  const [startTime, setStartTime] = useState(0);
  const [newData, setNewData] = useState<Data>(data);

  const streamPipeline: StreamPipeline = (apiResponse: string, apiStatus: Status) => {
    setStatus(apiStatus);
    setResponse((prevResponse) => prevResponse + apiResponse);
  };

  useEffect(() => {
    if (!hasRun.current) {
      APIHandler(data, streamPipeline)
      setStartTime(Date.now())
      hasRun.current = true;
    }
  }, [data])

  useEffect(() => {
    if (status === 'done') {
      setNewData(NewData(data, response))
      SaveToCache(data)
      Bookmark(data, false)
      const endTime = Date.now()
      const duration: number = Math.round((endTime - startTime) / 100) / 10;
      showToast({ title: 'Done', message: `Streaming took ${duration}s to complete` });  // style add?
    }
    if (status === 'reset') {
      setResponse('');
    }
  }, [status])

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
              push(<NewEntry data={newData} />)
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
function NewData(data: Data, response: string) {
  let userMessage: Data["messages"][0] = data.messages.slice(-1)[0];
  let systemMessage: Data["messages"][0];
  if (typeof userMessage.content === 'string') {
    systemMessage = {
      role: 'system',
      content: response,
      timestamp: Date.now()
    };
  } else {
    systemMessage = {
      role: 'system',
      content: [...userMessage.content, { type: 'text', text: response }],
      timestamp: Date.now()
    };
  }
  data.messages.push(systemMessage);
  return data
}


async function SaveToCache(data: Data) {
  showToast({ title: 'Saving to Cache', style: Toast.Style.Animated });
  const raycastCache = new Cache();
  const cachedChatsString = raycastCache.get('cachedChats');
  const cachedChats = cachedChatsString ? JSON.parse(cachedChatsString) : [];
  if (cachedChats.length > 0) {
    for (let i = 0; i < cachedChats.length; i++) {
      if (cachedChats[i].id == data.id) {
        cachedChats.splice(i, 1);
      }
    }
    // Remove any repeated items (new entries of the same conversation)
    if (cachedChats.length >= 15) {
      const newCachedChats = cachedChats.slice(1).concat(data);
      raycastCache.set('cachedChats', JSON.stringify(newCachedChats));
    } else {
      const newCachedChats = cachedChats.concat(data);
      raycastCache.set('cachedChats', JSON.stringify(newCachedChats));
    }
  } else {
    const list = [data];
    raycastCache.set('cachedChats', JSON.stringify(list));
  }
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
