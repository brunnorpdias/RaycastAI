import { Detail, showToast } from "@raycast/api";
import { gptStatic } from './openAI'
import { useEffect, useState } from 'react';

type Data = {
  prompt: string;
  company: string;
  model: string;
  // instructions: string;
  temperature: number;
  stream: boolean;
};

export default function Command({ data }: { data: Data }) {
  const [startTime, setStartTime] = useState(0);
  const [response, setResponse] = useState('');
  const [status, setStatus] = useState('');

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
      if (data.company === 'openai' && data.stream === true) {
        await gptStatic(data, onResponse);
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
    };
  }, [status]);

  // useEffect(() => {
  //     if (status == 'done') {
  //     };
  // }, [endTime, startTime]);

  return <Detail markdown={response} />;
}
