import { Detail, showToast, useNavigation, ActionPanel, Action, Icon } from "@raycast/api";
import { useEffect, useRef, useState } from 'react';
import assert from "assert";

import * as OpenAI from "../fetch/openAI";
import * as Functions from "../utils/functions";
import { APIHandler } from '../utils/api_handler';
import DeepResearch from "./deepResearch";

import { type ChatSession, Role, ReasoningLevel } from "../utils/models";

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



export default function Answer({ chat: initialChat, msgTimestamp }: {
  // chat renamed as initialChat
  chat: ChatSession;
  msgTimestamp?: number;
}) {

  const { push } = useNavigation();
  const hasRun = useRef(false);
  const hasStartedStreaming = useRef(false);
  const [apiStatus, setApiStatus] = useState<APIStatus>('idle');
  const [response, setResponse] = useState('');
  const [startTime, setStartTime] = useState(0);
  const [chat, setChat] = useState<ChatSession>(initialChat);
  const [promptTokens, setPromptTokens] = useState<number>();
  const [responseTokens, setResponseTokens] = useState<number>();
  const [responseID, setResponseID] = useState<string | undefined>();
  const chatRef = useRef(chat);
  useEffect(() => {
    chatRef.current = chat;
  }, [chat]);

  useEffect(() => {
    if (msgTimestamp) {
      OpenHistoricalMessage(chat, setResponse, setChat, msgTimestamp);
    } else if (!hasRun.current) {
      const nextChat: ChatSession = {
        ...chatRef.current,
        workflowState: chatRef.current.workflowState && ['chat_queued', 'completed'].includes(chatRef.current.workflowState) ?
          'chat_processing' :
          chatRef.current.workflowState === 'dr_queued' ?
            'dr_clarifying' :
            chatRef.current.workflowState === 'dr_awaiting' ?
              'dr_improving_prompt' : undefined
      }
      setChat(nextChat)
      hasRun.current = true;
      setStartTime(Date.now())
      APIHandler(nextChat, streamPipeline)
    }
  }, [chat])

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
      const newChat: ChatSession = {
        ...chatRef.current,
        workflowState: chatRef.current.workflowState === 'chat_processing' ?
          'completed' :
          chatRef.current.workflowState === 'dr_clarifying' ?
            'dr_awaiting' :
            chatRef.current.workflowState === 'dr_improving_prompt' ?
              'dr_prompt_complete' : undefined
      }
      setChat(newChat);
      if (newChat.workflowState !== 'dr_prompt_complete') {
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
      SaveChat();

      if (responseTokens) {
        const tokensPerSecond: number = Math.round(responseTokens / duration)
        showToast({
          title: 'Done', message: `Response took ${duration}s (${responseTokens.toLocaleString()} tokens; ${tokensPerSecond}t/s)`
        });
      } else {
        showToast({ title: 'Done', message: `Streaming took ${duration}s to complete` });  // style add?
      }

      if (chatRef.current.workflowState === 'dr_prompt_complete') {
        // send request before?? use background state and close connection? how to get the response id?
        push(<DeepResearch chat={chatRef.current} />)
      }
    }
  }, [apiStatus])

  async function SaveChat() {
    const userMsgs = chatRef.current.messages.filter(msg => msg.role === 'user');
    const userMsg = userMsgs.at(-1);

    const previousTokenCount = chatRef.current.messages
      .map(msg => msg.tokenCount)
      .filter(tokens => typeof tokens === 'number')
      .reduce((sum, n) => sum + n, 0);

    // adjustment to the number of tokens to avoid double counting
    if (userMsg && promptTokens) {
      userMsg.tokenCount = promptTokens - (previousTokenCount ?? 0);
    }

    let responseMsg: ChatSession["messages"][0] = {
      id: responseID ?? undefined,
      role: Role.Assistant,
      content: response,
      timestamp: Date.now(),
      tokenCount: responseTokens,
    }

    const newChat: ChatSession = {
      ...chatRef.current,
      messages: [...chatRef.current.messages, responseMsg],
    }

    assert(newChat !== undefined, 'Chat is not defined')
    setChat(newChat);

    if (!chatRef.current.tools?.includes('deepResearch')) {
      await Functions.CacheChat(newChat);
      await Functions.BookmarkChat(newChat, false);
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

          {/* {chat.model !== 'gpt-4o-transcribe' && ['completed', 'dr_awaiting', 'dr_prompt_complete', undefined].includes(chat.workflowState) && ( */}
          {chat.model !== 'gpt-4o-transcribe' && ['completed', 'dr_awaiting', undefined].includes(chat.workflowState) && (
            <Action
              title={chat.workflowState === 'completed' ?
                'New entry' :
                chat.workflowState === 'dr_awaiting' ?
                  'Improve prompt' :
                  // chat.workflowState === 'dr_prompt_complete' ?
                  //   'Start research' :
                  'New entry'  // case for older chats without a state parameter
              }
              icon={Icon.Plus}
              onAction={() => {
                // if (['completed', undefined].includes(chat.workflowState)) {
                if (['completed', 'dr_awaiting', undefined].includes(chat.workflowState)) {
                  Functions.CreateNewEntry(chat, push, msgTimestamp)
                  // } else if (chat.workflowState === 'dr_awaiting') {
                  // } else if (chat.workflowState === 'dr_prompt_complete') {
                  //   push(<DeepResearch chat={chat} />)
                }
              }}
            />
          )}

          {chat.model !== 'gpt-4o-transcribe' && (
            // change this to import transcription / non text models from types.tsx
            // add option to go to history.tsx directly from the chat (cmd + y) ?
            <Action
              title="Bookmark"
              icon={Icon.Bookmark}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={async () => {
                Functions.BookmarkChat(chat, true)
              }}
            />
          )}

          {chat.model === 'gpt-4o-transcribe' && (
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
async function OpenHistoricalMessage(chat: ChatSession, setResponse: Function, setChat: Function, msgTimestamp: number) {
  // Changed from id to timestamp, later added id separately, on the future remove the if condition, unnecessary for new users
  let selected_message = chat.messages.findLast(msg =>
    msg.timestamp ?
      msg.timestamp === msgTimestamp :
      Number(msg.id) === msgTimestamp
  )
  assert(selected_message, 'Error finding selected message')

  setResponse(selected_message.content)
  setChat(chat)
}


function ImproveTranscript(response: string, push: Function) {
  const prompt: string = `Analyze the following transcript. Identify the core themes and key points. 
                          Reorganize and rewrite the content into a coherent narrative. Eliminate 
                          redundancies, filler words, and tangents. Ensure a smooth flow between ideas, 
                          presenting the information as a structured piece rather than a fragmented 
                          conversation/monologue. Maintain the original meaning and the tone, but with 
                          a clear flow of ideas.\n\n**Transcript**\n${response}`

  const transcriptData: ChatSession = {
    timestamp: Date.now(),
    messages: [{ role: Role.User, content: prompt, timestamp: Date.now() }],
    model: 'gpt-4.1-mini',
    api: 'openai',
    reasoning: ReasoningLevel.None,
    instructions: '',
    files: [],
  }

  push(<Answer chat={transcriptData} />)
}
