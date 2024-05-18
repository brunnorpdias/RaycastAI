import { Detail, showToast, useNavigation, ActionPanel, Action } from "@raycast/api";
import { GroqAPI } from './groq';
import { OpenAPI } from './openAI';
import { DMindAPI } from './deepmind';
import { PplxAPI } from './perplexity';
import { Anthropic } from './anthropic';
import NewEntry from './newentry';
import { useEffect, useState } from 'react';

type Data = {
  conversation: Array<{ role: 'user' | 'assistant', content: string }>;
  api: string;
  model: string;
  // instructions: string;
  temperature: number;
  stream: boolean;
  timestamp: number;
};

export default function Answer({ data }: { data: Data }) {
  const [startTime, setStartTime] = useState(0);
  const [response, setResponse] = useState('');
  const [status, setStatus] = useState('');
  const [newData, setNewData] = useState<Data>(data);
  const { push } = useNavigation();

  useEffect(() => {
    if (startTime === 0) {
      setStartTime(Date.now());
    };
  }, [startTime]);

  useEffect(() => {
    const onResponse = (apiResponse: string, apiStatus: string) => {
      setStatus(apiStatus);
      setResponse((prevResponse) => prevResponse + apiResponse);
    };
    const fetchData = async () => {
      if (data.api === 'openai') {
        await OpenAPI(data, onResponse);
      } else if (data.api === 'anthropic') {
        // let response: string = await Anthropic(data);
        // setResponse(response);
        // setStatus("done");
        Anthropic(data, onResponse);
      } else if (data.api === 'perplexity') {
        // llama is open source and doesn't have an api, so I'll run it using perplexity
        await PplxAPI(data, onResponse);
      } else if (data.api === 'deepmind') {
        await DMindAPI(data, onResponse);
      } else if (data.api === 'groq') {
        GroqAPI(data, onResponse);
      };
    };
    fetchData();
  }, [data]);

  useEffect(() => {
    // add waiting status
    if (status === 'done') {
      const endTime = Date.now();
      const duration = Math.round((endTime - startTime) / 100) / 10;
      showToast({ title: 'Done', message: `Streaming took ${duration}s to complete` });
      const temp: Data = {
        ...data,
        conversation: [...data.conversation, { role: 'assistant', content: response }]
      }
      setNewData(temp);
    };
  }, [status]);

  return (
    <Detail
      // navigationTitle
      markdown={response}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title='Copy Response' content={response} />
          <Action
            title="New Entry"
            onAction={() => {
              push(<NewEntry data={newData} />)
            }}
          />
          <Action.CopyToClipboard
            title='Copy Data'
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
