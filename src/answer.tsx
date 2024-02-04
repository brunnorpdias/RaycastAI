import { Detail, showToast, useNavigation, ActionPanel, Action } from "@raycast/api";
import { OpenAPI } from './openAI';
import { DMindAPI } from './deepmind';
import { PplxAPI } from './perplexity';
import NewEntry from './newentry';
import { useEffect, useState } from 'react';

type Data = {
  conversation: Array<{role: string, content: string}>;
  api: string;
  model: string;
  // instructions: string;
  temperature: number;
  stream: boolean;
  timestamp: number;
};

export default function Command({ data }: { data: Data }) {
  const [startTime, setStartTime] = useState(0);
  const [response, setResponse] = useState('');
  const [status, setStatus] = useState('');
  const [updatedData, setUpdatedData] = useState<Data>();
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
      } else if (data.api === 'perplexity') {
        // llama is open source and don't have an api, so I'll run it from perplexity
        await PplxAPI(data, onResponse);
      } else if (data.api === 'deepmind' && !data.stream) {
        // await DMindApi(data, onResponse);
        // const x = await DMindAPI(data);
        // setResponse(x);
      };
    };
    fetchData();
  }, [data]);

  useEffect(() => {
    // add waiting status
    if (status === 'done') {
      const endTime = Date.now();
      const duration = Math.round((endTime - startTime) / 100) / 10;
      showToast({ title: 'Done', message: `Streaming took ${duration}s to complete`});
      const temp: Data = {
        ...data,
        conversation: [...data.conversation, {role: 'assistant', content: response}]
      }
      setUpdatedData(temp);
    };
  }, [status]);

  return (
    <Detail
      // navigationTitle
      markdown={response}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title='Copy Response' content={response} />
            <Action.CopyToClipboard title='Copy Data' content={JSON.stringify(updatedData?.conversation)} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Conversation">
            <Action
            title="New Entry"
            onAction={() => {
              push(<NewEntry data={updatedData} />)
            }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  )
}

