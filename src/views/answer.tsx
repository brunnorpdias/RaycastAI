import { Detail, showToast, Toast, useNavigation, ActionPanel, Action, Icon } from "@raycast/api";
import NewEntry from './new_entry';
import { useEffect, useRef, useState } from 'react';

import * as OpenAI from "../fetch/openAI";
import * as Functions from "../utils/functions";
import { APIHandler } from '../utils/api_handler';

import { type Data } from "../utils/types";
export type Status = 'idle' | 'streaming' | 'done' | 'reset';
export type StreamPipeline = ({
  apiResponse,
  apiStatus,
  msgID,
  promptTokens,
  responseTokens
}: {
  apiResponse: string,
  apiStatus: Status,
  msgID?: string,
  promptTokens?: number,
  responseTokens?: number
}) => void;



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
  const [promptTokens, setPromptTokens] = useState<number>();
  const [responseTokens, setResponseTokens] = useState<number>();
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
      const duration: number = Math.round((Date.now() - startTime) / 100) / 10;
      SaveData();
      if (responseTokens) {
        const tokensPerSecond: number = Math.round(responseTokens / duration)
        showToast({
          title: 'Done', message: `Response took ${duration}s (${responseTokens.toLocaleString()} tokens; ${tokensPerSecond}t/s)`
        });
      } else {
        showToast({ title: 'Done', message: `Streaming took ${duration}s to complete` });  // style add?
      }
    }
  }, [status])

  const streamPipeline: StreamPipeline = ({ apiResponse, apiStatus, msgID, promptTokens, responseTokens }) => {
    setStatus(apiStatus);
    if (apiStatus !== 'reset') {
      setResponse((prevResponse: string) => prevResponse + apiResponse);
    } else {
      setResponse('')
    }
    if (apiStatus === 'done') {
      setMsgId(msgID)
      setPromptTokens(promptTokens);
      setResponseTokens(responseTokens);
    }
  };

  async function SaveData() {
    const finalData: Data = await NewData(data, response, promptTokens, responseTokens, msgID);
    setNewData(finalData);
    Functions.Cache(finalData);
    Functions.Bookmark(finalData, false);
  }


  return (
    <Detail
      markdown={response}
      actions={
        <ActionPanel>

          <Action.CopyToClipboard
            title='Copy Response'
            icon={Icon.Clipboard}
            content={response}
          />

          {data.model !== 'gpt-4o-transcribe' && (
            <Action
              title="New Entry"
              icon={Icon.Plus}
              onAction={() => {
                CreateNewEntry(data, newData, push, msgTimestamp)
              }}
            />
          )}

          {data.model !== 'gpt-4o-transcribe' && (
            <Action
              title="Bookmark"
              icon={Icon.Bookmark}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={async () => {
                Functions.Bookmark(data, true)
              }}
            />
          )}

          {data.model === 'gpt-4o-transcribe' && (
            <Action
              title="Improve Transcript"
              icon={Icon.Paragraph}
              onAction={() => {
                ImproveTranscript(response, push)
              }}
            />
          )}

          <Action
            title="TTS"
            icon={Icon.SpeakerOn}
            onAction={() => {
              OpenAI.TTS(response)
            }}
          />

        </ActionPanel>
      }
    />
  )
}


//  Helper Functions  //
async function NewData(data: Data, response: string, promptTokens?: number, responseTokens?: number, msgId?: string) {
  let userMessage = data.messages.filter(msg => msg.role === 'user').at(-1);
  let assistantMessage: Data["messages"][0];
  if (userMessage && typeof userMessage.content === 'string') {
    userMessage.tokenCount = promptTokens ? promptTokens : undefined;
    assistantMessage = {
      role: data.api !== 'deepmind' ? 'assistant' : 'model',
      content: response,
      timestamp: Date.now(),
      tokenCount: responseTokens,
    };
  } else {
    assistantMessage = {
      role: data.api !== 'deepmind' ? 'assistant' : 'model',
      content: [{ type: 'text', text: response }],
      timestamp: Date.now(),
      tokenCount: responseTokens,
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


function CreateNewEntry(data: Data, newData: Data, push: Function, msgTimestamp?: number) {
  // is this a cached or bookmarked chat?
  const lastTimestamp = data.messages.at(-1)?.timestamp
  if (msgTimestamp && msgTimestamp !== lastTimestamp) {
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


function ImproveTranscript(response: string, push: Function) {
  const prompt: string = `Analyze the following transcript. Identify the core themes and key points. 
                          Reorganize and rewrite the content into a coherent narrative. Eliminate 
                          redundancies, filler words, and tangents. Ensure a smooth flow between ideas, 
                          presenting the information as a structured piece rather than a fragmented 
                          conversation/monologue. Maintain the original meaning and the tone, but with 
                          a clear flow of ideas.\n\n**Transcript**\n${response}`

  const transcriptData: Data = {
    timestamp: Date.now(),
    messages: [{ role: 'user', content: prompt, timestamp: Date.now() }],
    model: 'chatgpt-4o-latest',
    api: 'openai',
    reasoning: 'none',
    instructions: '',
    temperature: 1,
    attachments: []
  }

  push(<Answer data={transcriptData} />)
}
