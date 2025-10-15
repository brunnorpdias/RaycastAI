import { Detail, showToast, useNavigation, ActionPanel, Action, Icon, LocalStorage } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import assert from "assert";

import * as OpenAI from "../fetch/openAI";
import * as Functions from "../utils/functions";
import { APIHandler } from "../utils/api_handler";

import { type ChatSession, Role, ReasoningLevel, ApiStatus } from "../utils/models";

type Status = "idle" | ApiStatus | "reset";

export type StreamPipeline = ({
  apiResponse,
  apiStatus,
  responseID,
  promptTokens,
  responseTokens,
}: {
  apiResponse?: string;
  apiStatus?: Status;
  responseID?: string;
  promptTokens?: number;
  responseTokens?: number;
}) => void;

// chat renamed as initialChat
export default function Answer({ chat: initialChat, msgTimestamp }: { chat: ChatSession; msgTimestamp?: number }) {
  const { push } = useNavigation();
  const hasRun = useRef(false);
  const hasStartedStreaming = useRef(false);
  const [apiStatus, setApiStatus] = useState<Status>("idle");
  const [response, setResponse] = useState("");
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
      const chat: ChatSession = {
        ...chatRef.current,
        workflowStage: "chat_processing",
      };
      setChat(chat);
      hasRun.current = true;
      setStartTime(Date.now());
      APIHandler(chat, streamPipeline);
    }
  }, [chat]);

  const streamPipeline: StreamPipeline = ({ apiResponse, apiStatus, responseID, promptTokens, responseTokens }) => {
    if (apiStatus === "queued") {
      setApiStatus(apiStatus);
    } else if (apiStatus === "in_progress") {
      setApiStatus(apiStatus);
      setResponse((prevResponse: string) => prevResponse + apiResponse);
      if (!hasStartedStreaming.current) {
        hasStartedStreaming.current = true;
      }
    } else if (apiStatus === "completed") {
      setResponseID(responseID);
      setPromptTokens(promptTokens);
      setApiStatus(apiStatus);
      setResponseTokens(responseTokens);
      if (apiResponse) {
        setResponse((prevResponse: string) => prevResponse + apiResponse);
      }
      const newChat: ChatSession = {
        ...chatRef.current,
        workflowStage: "completed",
      };
      setChat(newChat);
    } else if (apiStatus === "cancelled" || apiStatus === "incomplete" || apiStatus === "failed") {
      setApiStatus(apiStatus);
    } else if (apiStatus === "reset") {
      setResponse("");
    }
  };

  useEffect(() => {
    if (apiStatus === "completed") {
      const duration: number = Math.round((Date.now() - startTime) / 100) / 10;
      if (responseTokens) {
        const tokensPerSecond: number = Math.round(responseTokens / duration);
        showToast({
          title: "Done",
          message: `Response took ${duration}s (${responseTokens.toLocaleString()} tokens; ${tokensPerSecond}t/s)`,
        });
      } else {
        showToast({ title: "Done", message: `Streaming took ${duration}s to complete` });
      }

      (async () => {
        const chat = chatRef.current;
        const updatedChat: ChatSession = await UpdateChat(chat, response, responseID, promptTokens, responseTokens);
        await Functions.CacheChat(updatedChat);
        await Functions.BookmarkChat(updatedChat, false);
        setChat(updatedChat);
      })();
    }
  }, [apiStatus]);

  return (
    <Detail
      markdown={response}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Response" icon={Icon.Clipboard} content={response} />

          {chat.model !== "gpt-4o-transcribe" && ["completed", undefined].includes(chat.workflowStage) && (
            <Action
              title={"New Entry"}
              icon={Icon.Plus}
              onAction={() => {
                if (["completed", undefined].includes(chat.workflowStage)) {
                  Functions.CreateNewEntry(chat, push, msgTimestamp);
                }
              }}
            />
          )}

          {chat.model !== "gpt-4o-transcribe" && (
            // change this to import transcription / non text models from types.tsx
            // add option to go to history.tsx directly from the chat (cmd + y) ?
            <Action
              title="Bookmark"
              icon={Icon.Bookmark}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={async () => {
                Functions.BookmarkChat(chat, true);
              }}
            />
          )}

          {chat.model === "gpt-4o-transcribe" && (
            <Action
              title="Improve Transcript"
              icon={Icon.Paragraph}
              onAction={() => {
                ImproveTranscript(response, push);
              }}
            />
          )}

          <Action
            title="Tts"
            icon={Icon.SpeakerOn}
            onAction={() => {
              OpenAI.TTS(response);
            }}
          />
        </ActionPanel>
      }
    />
  );
}

//  Helper Functions  //
async function OpenHistoricalMessage(
  chat: ChatSession,
  setResponse: Function,
  setChat: Function,
  msgTimestamp: number,
) {
  // Changed from id to timestamp, later added id separately, on the future remove the if condition, unnecessary for new users
  const selected_message = chat.messages.findLast((msg) =>
    msg.timestamp ? msg.timestamp === msgTimestamp : Number(msg.id) === msgTimestamp,
  );
  assert(selected_message, "Error finding selected message");

  setResponse(selected_message.content);
  setChat(chat);
}

async function UpdateChat(
  chat: ChatSession,
  response: string,
  responseID?: string,
  promptTokens?: number,
  responseTokens?: number,
  drID?: string,
) {
  const userMsgs = chat.messages.filter((msg) => msg.role === "user");
  const lastUserMessage = userMsgs.at(-1);

  const previousTokenCount = chat.messages
    .map((msg) => msg.tokenCount)
    .filter((tokens) => typeof tokens === "number")
    .reduce((sum, n) => sum + n, 0);

  // adjustment to the number of tokens to avoid double counting
  if (lastUserMessage && promptTokens) {
    lastUserMessage.tokenCount = promptTokens - (previousTokenCount ?? 0);
  }

  const responseMsg: ChatSession["messages"][number] = {
    id: responseID ?? undefined,
    role: Role.Assistant,
    content: response,
    timestamp: Date.now(),
    tokenCount: responseTokens,
  };

  const updatedChat: ChatSession = {
    ...chat,
    messages: [...chat.messages, responseMsg],
  };

  // Conversation reformatting completed

  return updatedChat;
}

function ImproveTranscript(response: string, push: Function) {
  const prompt: string = `Analyze the following transcript. Identify the core themes and key points. 
                          Reorganize and rewrite the content into a coherent narrative. Eliminate 
                          redundancies, filler words, and tangents. Ensure a smooth flow between ideas, 
                          presenting the information as a structured piece rather than a fragmented 
                          conversation/monologue. Maintain the original meaning and the tone, but with 
                          a clear flow of ideas.\n\n**Transcript**\n${response}`;

  const transcriptData: ChatSession = {
    timestamp: Date.now(),
    messages: [{ role: Role.User, content: prompt, timestamp: Date.now() }],
    model: "gpt-4.1-mini",
    api: "openai",
    reasoning: ReasoningLevel.None,
    instructions: "",
    files: [],
  };

  push(<Answer chat={transcriptData} />);
}
