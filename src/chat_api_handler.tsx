import { useEffect, useState, useRef } from 'react';
import { showToast } from "@raycast/api";
import * as OpenAPI from './fetch/openAI';
import { AnthropicAPI } from './fetch/anthropic';
import * as DeepmindAPI from './fetch/deepmind';
import { GroqAPI } from './fetch/groq';
import * as GrokAPI from './fetch/grok';
import { PplxAPI } from './fetch/perplexity';
// import * as GoogleOpenAI from './fetch/google_openai';
import AnswerView from './chat_answer';

import { type Data } from "./chat_form";


export default function APIHandler(data: Data) {
  const [startTime, setStartTime] = useState(0);
  const [response, setResponse] = useState('');
  const [status, setStatus] = useState('');
  const [newData, setNewData] = useState<Data>(data);
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (startTime === 0) {
      setStartTime(Date.now());
    }
  }, [startTime]);

  useEffect(() => {
    if (!hasRunRef.current) {
      APIrequest(data);
      console.log(JSON.stringify(data))
    }
  }, [data]);

  useEffect(() => {
    // add waiting status
    if (status === 'done') {
      const endTime = Date.now();
      const tempData: Data = {
        ...data,
        messages: [...data.messages, { role: 'assistant', content: response, timestamp: Date.now() }]
      };
      setNewData(tempData);

      const duration = Math.round((endTime - startTime) / 100) / 10;
      showToast({ title: 'Done', message: `Streaming took ${duration}s to complete` });
    };
  }, [status]);

  async function APIrequest(data: Data) {
    hasRunRef.current = true;

    const onResponse = (apiResponse: string, apiStatus: string) => {
      setStatus(apiStatus);
      setResponse((prevResponse) => prevResponse + apiResponse);
      data.messages.slice(-1)[0].content = response; // add support for non strings content
      console.log(apiResponse)
      AnswerView(data)
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
      case 'grok':
        await GrokAPI.RunChat(data, onResponse);
        break;
      case 'perplexity':
        await PplxAPI(data, onResponse);
        break;
    }
  }
}
