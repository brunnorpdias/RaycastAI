import { Detail, showToast, useNavigation, ActionPanel, Action, Icon } from "@raycast/api";
import { useEffect, useRef, useState } from 'react';

import * as OpenAI from "../fetch/openAI";
import * as Functions from "../utils/functions";
import { APIHandler } from '../utils/api_handler';

import { type Data } from "../utils/models";
import assert from "assert";
export type Status = 'idle' | 'processing' | 'thinking' | 'streaming' | 'done' | 'reset';
export type StreamPipeline = ({
  apiResponse,
  apiStatus,
  responseID,
  promptTokens,
  responseTokens
}: {
  apiResponse?: string,
  apiStatus?: Status,
  responseID?: string,
  promptTokens?: number,
  responseTokens?: number
}) => void;



export default function Answer({ data, msgTimestamp }: {
  data: Data;
  msgTimestamp?: number;
}) {
  const { push } = useNavigation();
  const hasRun = useRef(false);
  const hasStartedStreaming = useRef(false);
  const [status, setStatus] = useState<Status>('idle');
  const [response, setResponse] = useState('');
  const [startTime, setStartTime] = useState(0);
  const [newData, setNewData] = useState<Data>(data);
  const [promptTokens, setPromptTokens] = useState<number>();
  const [responseTokens, setResponseTokens] = useState<number>();
  const [responseID, setResponseID] = useState<string | undefined>();

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

  const streamPipeline: StreamPipeline = ({ apiResponse, apiStatus, responseID, promptTokens, responseTokens }) => {
    if (apiStatus === 'streaming' || apiStatus === 'thinking') {
      setResponse((prevResponse: string) => prevResponse + apiResponse);
      if (!hasStartedStreaming.current) {
        // showToast({ title: 'Streaming', style: Toast.Style.Animated })
        setStatus(apiStatus);
        hasStartedStreaming.current = true
      }
    } else if (apiStatus === 'reset') {
      setResponse('')
    } else if (apiStatus === 'done') {
      setStatus(apiStatus);
      setResponse((prevResponse: string) => prevResponse + apiResponse);
      setResponseID(responseID)
      setPromptTokens(promptTokens);
      setResponseTokens(responseTokens);
    }
  };

  async function SaveData() {
    const finalData: Data = await NewData(data, response, promptTokens, responseTokens, responseID);
    assert(finalData !== undefined, 'Data is not defined')
    setNewData(finalData);
    await Functions.Cache(finalData);
    await Functions.Bookmark(finalData, false);
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
                Functions.CreateNewEntry(data, newData, push, msgTimestamp)
              }}
            />
          )}

          {data.model !== 'gpt-4o-transcribe' && (
            // change this to import transcription / non text models from types.tsx
            // add option to go to history.tsx directly from the chat (cmd + y) ?
            <Action
              title="Bookmark"
              icon={Icon.Bookmark}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={async () => {
                Functions.Bookmark(newData, true)
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
async function NewData(data: Data, response: string, promptTokens?: number, responseTokens?: number, responseID?: string) {
  const userMsgs = data.messages.filter(msg => msg.role === 'user');
  const userMsg = userMsgs.at(-1);

  const previousTokenCount = data.messages
    .map(msg => msg.tokenCount)
    .filter(tokens => typeof tokens === 'number')
    .reduce((sum, n) => sum + n, 0);

  // adjustment to the number of tokens to avoid double counting
  if (userMsg && promptTokens) {
    userMsg.tokenCount = promptTokens - (previousTokenCount ?? 0);
  }

  let responseMsg: Data["messages"][0] = {
    id: responseID ?? undefined,
    role: 'assistant',
    content: response,
    timestamp: Date.now(),
    tokenCount: responseTokens,
  }

  const newData: Data = {
    ...data,
    messages: [...data.messages, responseMsg],
  }

  return newData
}


async function OpenHistoricalMessage(data: Data, setResponse: Function, setNewData: Function, msgTimestamp: number) {
  // Changed from id to timestamp, later added id separately, on the future remove the if condition, unnecessary for new users
  let selected_message = data.messages.findLast(msg =>
    msg.timestamp ?
      msg.timestamp === msgTimestamp :
      Number(msg.id) === msgTimestamp
  )
  assert(selected_message, 'Error finding selected message')

  setResponse(selected_message.content)
  setNewData(data)
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
    model: 'gpt-4.1-mini',
    api: 'openai',
    reasoning: 'none',
    instructions: '',
    files: [],
  }

  push(<Answer data={transcriptData} />)
}
