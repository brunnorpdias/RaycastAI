import { Detail, showToast, useNavigation, ActionPanel, Action, Icon } from "@raycast/api";
import { useEffect, useRef, useState } from 'react';
import assert from "assert";

import * as OpenAI from "../fetch/openAI";
import * as Functions from "../utils/functions";
import { APIHandler } from '../utils/api_handler';
import DeepResearch from "./deepResearch";

import { type Data } from "../utils/models";

type APIStatus = 'idle' | 'received' | 'reset' | 'thinking' | 'streaming' | 'done' | 'error';

export type StreamPipeline = ({
  apiResponse,
  apiStatus,
  responseID,
  promptTokens,
  responseTokens
}: {
  apiResponse?: string,
  apiStatus?: APIStatus,
  responseID?: string,
  promptTokens?: number,
  responseTokens?: number
}) => void;



export default function Answer({ data: initialData, msgTimestamp }: {
  // data renamed as initialData
  data: Data;
  msgTimestamp?: number;
}) {

  const { push } = useNavigation();
  const hasRun = useRef(false);
  const hasStartedStreaming = useRef(false);
  const [apiStatus, setApiStatus] = useState<APIStatus>('idle');
  const [response, setResponse] = useState('');
  const [startTime, setStartTime] = useState(0);
  const [data, setData] = useState<Data>(initialData);
  const [promptTokens, setPromptTokens] = useState<number>();
  const [responseTokens, setResponseTokens] = useState<number>();
  const [responseID, setResponseID] = useState<string | undefined>();
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    if (msgTimestamp) {
      OpenHistoricalMessage(data, setResponse, setData, msgTimestamp);
    } else if (!hasRun.current) {
      console.log(`state 1a: ${dataRef.current.workflowState}`)
      const nextData: Data = {
        ...dataRef.current,
        workflowState: dataRef.current.workflowState && ['chat_queued', 'completed'].includes(dataRef.current.workflowState) ?
          'chat_processing' :
          dataRef.current.workflowState === 'dr_queued' ?
            'dr_clarifying' :
            dataRef.current.workflowState === 'dr_awaiting' ?
              'dr_improving_prompt' : undefined
      }
      setData(nextData)
      console.log(`state 1b: ${nextData.workflowState}`)
      hasRun.current = true;
      setStartTime(Date.now())
      APIHandler(nextData, streamPipeline)
    }
  }, [data])

  const streamPipeline: StreamPipeline = ({ apiResponse, apiStatus, responseID, promptTokens, responseTokens }) => {
    if (apiStatus === 'received') {
    } else if (apiStatus === 'thinking') {
      setResponse((prevResponse: string) => prevResponse + apiResponse);
      if (!hasStartedStreaming.current) {
        hasStartedStreaming.current = true
      }
    } else if (apiStatus === 'streaming') {
      setResponse((prevResponse: string) => prevResponse + apiResponse);
    } else if (apiStatus === 'done') {
      console.log(`state 2a: ${dataRef.current.workflowState}`)
      const newData: Data = {
        ...dataRef.current,
        workflowState: dataRef.current.workflowState === 'chat_processing' ?
          'completed' :
          dataRef.current.workflowState === 'dr_clarifying' ?
            'dr_awaiting' :
            dataRef.current.workflowState === 'dr_improving_prompt' ?
              'dr_prompt_complete' : undefined
      }
      setData(newData);
      console.log(`state 2b: ${newData.workflowState}`)
      if (newData.workflowState !== 'dr_prompt_complete') {
        setResponse((prevResponse: string) => prevResponse + apiResponse);
      }
      setResponseID(responseID);
      setPromptTokens(promptTokens);
      setApiStatus(apiStatus);
      setResponseTokens(responseTokens);
    } else if (apiStatus === 'reset') {
      setResponse('')
    } else if (apiStatus === 'error') {
    }
  };

  useEffect(() => {
    if (apiStatus === 'done') {
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

      if (dataRef.current.workflowState === 'dr_prompt_complete') {
        // send request before?? use background state and close connection? how to get the response id?
        push(<DeepResearch data={dataRef.current} />)
      }
    }
  }, [apiStatus])

  async function SaveData() {
    const userMsgs = dataRef.current.messages.filter(msg => msg.role === 'user');
    const userMsg = userMsgs.at(-1);

    const previousTokenCount = dataRef.current.messages
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
      ...dataRef.current,
      messages: [...dataRef.current.messages, responseMsg],
    }

    assert(newData !== undefined, 'Data is not defined')
    setData(newData);

    if (!dataRef.current.tools?.includes('deepResearch')) {
      await Functions.CacheChat(newData);
      await Functions.BookmarkChat(newData, false);
    }
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

          {/* {data.model !== 'gpt-4o-transcribe' && ['completed', 'dr_awaiting', 'dr_prompt_complete', undefined].includes(data.workflowState) && ( */}
          {data.model !== 'gpt-4o-transcribe' && ['completed', 'dr_awaiting', undefined].includes(data.workflowState) && (
            <Action
              title={data.workflowState === 'completed' ?
                'New entry' :
                data.workflowState === 'dr_awaiting' ?
                  'Improve prompt' :
                  // data.workflowState === 'dr_prompt_complete' ?
                  //   'Start research' :
                  'New entry'  // case for older chats without a state parameter
              }
              icon={Icon.Plus}
              onAction={() => {
                // if (['completed', undefined].includes(data.workflowState)) {
                if (['completed', 'dr_awaiting', undefined].includes(data.workflowState)) {
                  Functions.CreateNewEntry(data, push, msgTimestamp)
                  // } else if (data.workflowState === 'dr_awaiting') {
                  // } else if (data.workflowState === 'dr_prompt_complete') {
                  //   push(<DeepResearch data={data} />)
                }
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
                Functions.BookmarkChat(data, true)
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
async function OpenHistoricalMessage(data: Data, setResponse: Function, setData: Function, msgTimestamp: number) {
  // Changed from id to timestamp, later added id separately, on the future remove the if condition, unnecessary for new users
  let selected_message = data.messages.findLast(msg =>
    msg.timestamp ?
      msg.timestamp === msgTimestamp :
      Number(msg.id) === msgTimestamp
  )
  assert(selected_message, 'Error finding selected message')

  setResponse(selected_message.content)
  setData(data)
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
