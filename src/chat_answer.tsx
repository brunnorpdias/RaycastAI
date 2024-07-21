import { Detail, showToast, Toast, useNavigation, ActionPanel, Action, Cache, Icon, LocalStorage } from "@raycast/api";
import * as OpenAPI from './fetch/openAI';
import { AnthropicAPI } from './fetch/anthropic';
import { GroqAPI } from './fetch/groq';
import { PplxAPI } from './fetch/perplexity';
import NewEntry from './chat_newentry';
import { useEffect, useState, useRef } from 'react';

type Data = {
  conversation: Array<{ role: 'user' | 'assistant' | 'system', content: string, timestamp: number }>;
  api: string;
  model: string;
  temperature: number;
  stream: boolean;
  timestamp: number;
};

// Anthropic has a different type, since it doesn't support system messages yet
type DataAnthropic = {
  conversation: Array<{ role: 'user' | 'assistant', content: string }>;
  api: string;
  model: string;
  temperature: number;
  stream: boolean;
  timestamp: number;
};

type Messages = Array<{ role: 'user' | 'assistant', content: string }>;


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

    if (data.api === 'openai') {
      await OpenAPI.RunChat(data, onResponse);
    } else if (data.api === 'anthropic') {
      // Anthropic has a different type, since it doesn't support system messages yet
      const conversationAnthropic = data.conversation.slice(1) as DataAnthropic["conversation"];
      const dataAnthropic: DataAnthropic = { ...data, conversation: conversationAnthropic }
      AnthropicAPI(dataAnthropic, onResponse);
    } else if (data.api === 'perplexity') {
      // llama is open source and doesn't have an api, so I'll run it using perplexity
      await PplxAPI(data, onResponse);
    } else if (data.api === 'groq') {
      GroqAPI(data, onResponse);
    };
  }

  useEffect(() => {
    // add waiting status
    if (status === 'done') {
      const tempData: Data = {
        ...data,
        conversation: [...data.conversation, { role: 'assistant', content: response, timestamp: Date.now() }]
      };
      setNewData(tempData);

      showToast({ title: 'Saving to Cache', style: Toast.Style.Animated });
      const cache = new Cache();
      const cachedChatsString = cache.get('cachedChats');
      const cachedChats = cachedChatsString ? JSON.parse(cachedChatsString) : [];
      if (cachedChats.length > 0) {
        // Substitute chats with the same timestamp
        // const updatedCachedChats = cachedChats.filter((chat: Data) => chat.timestamp !== tempData.timestamp)
        for (let i = 0; i < cachedChats.length; i++) {
          console.log(cachedChats[i].timestamp)
          if (cachedChats[i].timestamp == tempData.timestamp) {
            cachedChats.splice(i, 1);
            // console.log(`removed item #${i}`)
          }
        }
        console.log(`\n`)

        // Remove any repeated items (new entries of the same conversation)
        if (cachedChats.length >= 10) {
          const newCachedChats = cachedChats.slice(1).concat(tempData);
          cache.set('cachedChats', JSON.stringify(newCachedChats));
        } else {
          const newCachedChats = cachedChats.concat(tempData);
          cache.set('cachedChats', JSON.stringify(newCachedChats));
        }

      } else {
        const list = [tempData];
        cache.set('cachedChats', JSON.stringify(list));
      }

      const endTime = Date.now();
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
                ...data,
                conversation: [
                  ...data.conversation,
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
                ...data,
                conversation: [
                  ...data.conversation,
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
              // Filter out system role and remove timestamp
              const filteredMessages = newData.conversation
                .filter(({ role }) => role === 'user' || role === 'assistant')
                .map(({ timestamp, ...rest }) => rest) as Messages;

              const title = await OpenAPI.TitleConversation(filteredMessages);
              if (await LocalStorage.getItem<string>(`${newData.timestamp}`)) {
                LocalStorage.removeItem(`${newData.timestamp}`);
              };
              await LocalStorage.setItem(
                `${newData.timestamp}`,
                JSON.stringify({ title: title, data: newData }),
              );
              showToast({ title: 'Bookmarked' });
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
