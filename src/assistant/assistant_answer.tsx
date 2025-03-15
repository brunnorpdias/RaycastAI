import { Detail, showToast, useNavigation, ActionPanel, Action, Cache, Icon, LocalStorage } from "@raycast/api";
import { useEffect, useState, useRef } from 'react';
import * as OpenAI from './fetch/openAI';
// import NewEntry from './assistant_newentry';
// ADD NEW PROMPT

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

export default function Answer({ data }: { data: Data }) {
  const [startTime, setStartTime] = useState(0);
  const [response, setResponse] = useState('');
  const [status, setStatus] = useState('');
  const [runID, setRunID] = useState('');
  const [newData, setNewData] = useState<Data>(data);
  const hasRunRef = useRef(false);
  const { push } = useNavigation();

  const onResponse = (apiResponse: string, apiStatus: string) => {
    setStatus(apiStatus);
    setResponse((prevResponse) => prevResponse + apiResponse);
  };

  async function APIrequest(data: Data) {
    hasRunRef.current = true;
    await OpenAI.NewThreadMessage(data);
    const temp = await OpenAI.RunThread(data, onResponse);
    if (temp) {
      setRunID(temp);
    }
  }

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

  useEffect(() => {
    // add waiting status
    if (status === 'done' && runID) {
      const endTime = Date.now();
      const duration = Math.round((endTime - startTime) / 100) / 10;
      showToast({ title: 'Done', message: `Streaming took ${duration}s to complete` });
      const temp: Data = {
        ...data,
        conversation: [...data.conversation, { role: 'assistant', content: response, timestamp: Date.now() }],
        runID: runID,
      }
      setNewData(temp);

      // const cache = new Cache();
      // cache.clear();
      // cache.set('lastConversation', JSON.stringify(temp))
      // add three conversations to cache (different for assistant and chat)
    };
  }, [status, runID]);

  return (
    <Detail
      markdown={response}
      actions={
        <ActionPanel>
          {/* <Action */}
          {/*   title="print data" */}
          {/*   onAction={() => { */}
          {/*     console.log(newData) */}
          {/*   }} */}
          {/* /> */}
          <Action.CopyToClipboard
            title='Copy Response'
            icon={Icon.Paragraph}
            content={response}
          />
          {/* <Action */}
          {/*   title="New Entry" */}
          {/*   icon={Icon.Plus} */}
          {/*   onAction={() => { */}
          {/*     push(<NewEntry data={newData} />) */}
          {/*   }} */}
          {/* /> */}
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
              push(<Answer data={temp} />)
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
              push(<Answer data={temp} />)
            }}
          />
          <Action.CopyToClipboard
            title='Copy Data'
            icon={Icon.Download}
            content={JSON.stringify(newData?.conversation)}
          />
          {/* <Action */}
          {/*   title='Rewrite Prompt' */}
          {/*   onAction={() => { */}
          {/*   }} */}
          {/* /> */}
        </ActionPanel>
      }
    />
  )
}



