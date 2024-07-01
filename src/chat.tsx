import { Detail, showToast, useNavigation, ActionPanel, Action, Cache, Icon, LocalStorage } from "@raycast/api";
import { GroqAPI } from './fetch/groq';
import { OpenAPI } from './fetch/openAI';
import { PplxAPI } from './fetch/perplexity';
import { Anthropic } from './fetch/anthropic';
import NewEntry from './newentry';
import { useEffect, useState, useRef } from 'react';

// Import section for the title-making when bookmarking the chat
import { API_KEYS } from "./enums/index";
import Groq from "groq-sdk";
const groqTitleModel = 'llama3-70b-8192';

type Data = {
  conversation: Array<{ role: 'user' | 'assistant' | 'system', content: string }>;
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

  function APIrequest(data: Data) {
    hasRunRef.current = true;

    const onResponse = (apiResponse: string, apiStatus: string) => {
      setStatus(apiStatus);
      setResponse((prevResponse) => prevResponse + apiResponse);
    };

    const fetchData = async () => {
      if (data.api === 'openai') {
        await OpenAPI(data, onResponse);
      } else if (data.api === 'anthropic') {
        // Anthropic has a different type, since it doesn't support system messages yet
        const conversationAnthropic = data.conversation.slice(1) as DataAnthropic["conversation"];
        const dataAnthropic: DataAnthropic = { ...data, conversation: conversationAnthropic }
        Anthropic(dataAnthropic, onResponse);
      } else if (data.api === 'perplexity') {
        // llama is open source and doesn't have an api, so I'll run it using perplexity
        await PplxAPI(data, onResponse);
      } else if (data.api === 'groq') {
        GroqAPI(data, onResponse);
      };
    };

    fetchData();
  }

  useEffect(() => {
    // add waiting status
    if (status === 'done') {
      const endTime = Date.now();
      const duration = Math.round((endTime - startTime) / 1000);
      showToast({ title: 'Done', message: `Streaming took ${duration}s to complete` });
      const temp: Data = {
        ...data,
        conversation: [...data.conversation, { role: 'assistant', content: response }]
      }
      setNewData(temp);

      const cache = new Cache();
      cache.clear();
      cache.set('lastConversation', JSON.stringify(temp))
      // console.log(cache.get('lastConversation'))
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
                  { role: 'user', content: "Give a title for this conversation in a heading, then summarise the content on the conversation without mentioning that" }
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
                  { role: 'user', content: "Give a title for this conversation in a heading, then give the main points in bullets without mentioning so" }
                ]
              }
              push(<Chat data={temp} />)
            }}
          />
          <Action
            title="Bookmark"
            icon={Icon.Bookmark}
            onAction={async () => {
              await LocalStorage.clear();
              const groq = new Groq({ apiKey: API_KEYS.GROQ });
              const chat = await groq.chat.completions.create({
                messages: [
                  ...newData.conversation.slice(1),
                  {
                    role: 'user',
                    content: 'Give a short and descriptive title to the chat without mentioning so or using special characters. Mention names, places, and other remarkable things'
                  }
                ],
                model: groqTitleModel
              });
              const title = chat.choices[0]?.message.content
              await LocalStorage.setItem(
                `${newData.timestamp}`,
                JSON.stringify({ title: title, data: newData }),
              );
              // console.log(await LocalStorage.allItems())
              showToast({ title: 'Bookmarked' });
            }}
          />
          <Action.CopyToClipboard
            title='Copy Data'
            icon={Icon.Download}
            content={JSON.stringify(newData?.conversation)}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
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
