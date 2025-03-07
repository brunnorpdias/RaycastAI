import { Detail, showToast, Toast, useNavigation, ActionPanel, Action, Cache, Icon, LocalStorage } from "@raycast/api";
import * as OpenAPI from './fetch/openAI';
import { AnthropicAPI } from './fetch/anthropic';
import * as DeepmindAPI from './fetch/deepmind';
import { GroqAPI } from './fetch/groq';
import { PplxAPI } from './fetch/perplexity';
// import * as GoogleOpenAI from './fetch/google_openai';
import NewEntry from './chat_newentry';
import { useEffect, useState, useRef } from 'react';

type Data = {
  id: number;
  temperature: number;
  conversation: Array<{
    role: 'user' | 'assistant',
    content: string | Array<{
      type: 'text' | 'document' | 'image',
      source?: object,
      text?: string
    }>,
    timestamp?: number
  }>;
  model: string;
  api?: string;
  systemMessage?: string;
  instructions?: string;
  stream?: boolean;
  assistantID?: string;
  threadID?: string;
  runID?: string;
  attachmentsDir: [string];
};

type Messages = Array<{ role: 'user' | 'assistant', content: string }>;

type Bookmarks = Array<{ title: string, data: Data }>;


export default function Chat({ data }: { data: Data }) {
  const [startTime, setStartTime] = useState(0);
  const [response, setResponse] = useState('');
  const [status, setStatus] = useState('');
  const [newData, setNewData] = useState<Data>(data);
  const hasRunRef = useRef(false);
  const { push } = useNavigation();

  useEffect(() => {
    if (startTime === 0) {
      setStartTime(Date.now());
    }
  }, [startTime]);

  useEffect(() => {
    if (!hasRunRef.current) {
      APIrequest(data);
    }
  }, [data]);

  async function APIrequest(data: Data) {
    hasRunRef.current = true;

    const onResponse = (apiResponse: string, apiStatus: string) => {
      setStatus(apiStatus);
      setResponse((prevResponse) => prevResponse + apiResponse);
    };

    switch (data.api) {
      case 'openai':
        await OpenAPI.RunChat(data, onResponse);
        break;
      case 'anthropic':
        await AnthropicAPI(data, onResponse);
        break;
      case 'deepmind':
        await DeepmindAPI.RunChat(data, onResponse);
        break;
      // case 'google':
      //   await GoogleOpenAI.RunChat(data, onResponse);
      //   break;
      case 'groq':
        await GroqAPI(data, onResponse);
        break;
      case 'perplexity':
        await PplxAPI(data, onResponse);
        break;
    }
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

  async function SubstituteBookmark(data: Data) {
    // Filter out system role and remove timestamp
    const filteredMessages = newData.conversation
      .filter(({ role }) => role === 'user' || role === 'assistant')
      .map(({ timestamp, ...rest }) => rest) as Messages;

    const stringData = await LocalStorage.getItem('bookmarks');
    if (typeof stringData !== 'string') return;

    const bookmarks: Bookmarks = JSON.parse(stringData);
    const bookmarkIndex = bookmarks.findIndex(bookmark => bookmark.data.id === data.id);
    if (bookmarkIndex === -1) return false;

    const title = await OpenAPI.TitleConversation(filteredMessages);
    if (typeof title !== 'string') return;
    bookmarks[bookmarkIndex] = { title, data };
    LocalStorage.setItem('bookmarks', JSON.stringify(bookmarks));
    showToast({ title: 'Bookmark re-saved', style: Toast.Style.Success })
    return true;
  }

  useEffect(() => {
    // add waiting status
    if (status === 'done') {
      const endTime = Date.now();
      const tempData: Data = {
        ...data,
        conversation: [...data.conversation, { role: 'assistant', content: response, timestamp: Date.now() }]
      };
      setNewData(tempData);
      SaveToCache(tempData);
      SubstituteBookmark(tempData);

      const duration = Math.round((endTime - startTime) / 100) / 10;
      showToast({ title: 'Done', message: `Streaming took ${duration}s to complete` });
    };
  }, [status]);


  return (
    <Detail
      // navigationTitle
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
            title="Summarise"
            icon={Icon.ShortParagraph}
            onAction={() => {
              hasRunRef.current = false;
              setResponse('')

              const temp: Data = {
                ...newData,
                conversation: [
                  ...newData.conversation,
                  { role: 'user', content: "Give a title for this conversation in a heading, then summarise the content on the conversation without mentioning that", timestamp: Date.now() }
                ]
              }
              push(<Chat data={temp} />)
            }}
          />

          <Action
            title="Main points"
            icon={Icon.BulletPoints}
            onAction={() => {
              hasRunRef.current = false;
              setResponse('')

              const temp: Data = {
                ...newData,
                conversation: [
                  ...newData.conversation,
                  { role: 'user', content: "Give a title for this conversation in a heading, then give the main points in bullets without mentioning so", timestamp: Date.now() }
                ]
              }
              push(<Chat data={temp} />)
            }}
          />

          <Action
            title="Bookmark"
            icon={Icon.Bookmark}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={async () => {
              const bookmarkSubstituted = await SubstituteBookmark(newData);
              if (bookmarkSubstituted !== undefined && !bookmarkSubstituted) {
                const filteredMessages = newData.conversation
                  .filter(({ role }) => role === 'user' || role === 'assistant')
                  .map(({ timestamp, ...rest }) => rest) as Messages;

                const title = await OpenAPI.TitleConversation(filteredMessages)
                if (typeof title === 'string') {
                  const stringData = await LocalStorage.getItem('bookmarks') as string;
                  const bookmarks: Bookmarks = JSON.parse(stringData ?? '[]')
                  const newBookmark = { title: title, data: newData }
                  const newBookmarks: Bookmarks = bookmarks.concat(newBookmark);
                  await LocalStorage.setItem(
                    'bookmarks',
                    JSON.stringify(newBookmarks),
                  );
                  showToast({ title: 'Bookmarked' });
                } else {
                  showToast({ title: 'Bookmarking Failed', style: Toast.Style.Failure })
                }
              }
            }}
          />

          <Action.CopyToClipboard
            title='Copy Data'
            icon={Icon.Download}
            content={JSON.stringify(newData?.conversation)}
          />
        </ActionPanel>
      }
    />
  )
}
/*
    <Action
      title='Rewrite Prompt'
      onAction={() => {
        push(<
      }
    />
*/
