import { Anthropic } from "@anthropic-ai/sdk";
import { showToast, Toast } from "@raycast/api";
import fs from "fs";

import { API_KEYS } from "../config/api_keys";

import { type MessageCreateParamsBase } from "@anthropic-ai/sdk/resources/messages";
import { type StreamPipeline } from "../views/answer";
import { type ChatSession, FileStatus, Role, ReasoningLevel } from "../utils/models";
import { getStoredFilePath } from "../utils/storage";
import assert from "assert";
import { chdir } from "process";

type AnthropicRequest = {
  model: string;
  system: string | undefined;
  messages: Messages;
  max_tokens: number;
  tools?: {
    type: string;
    name?: string;
    max_uses?: number;
  }[];
  // temperature: number;
  stream?: boolean;
  thinking?: {
    type: string;
    budget_tokens: number;
  };
};

type Messages = Array<{
  role: "user" | "assistant";
  content: Content;
}>;

type Content =
  | string
  | Array<{
    type: "text" | "document" | "image";
    text?: string;
    source?: {
      type: "url" | "base64";
      media_type?: "application/pdf" | "image/jpeg" | "image/png" | "image/gif" | "image/webp";
      data?: string;
      url?: string;
    };
    cache_control?: { type: "ephemeral" | "" };
  }>;

type Citation = {
  type: string,
  cited_text: string,
  url: string,
  title: string,
  encrypted_index: string
}

const client = new Anthropic({ apiKey: API_KEYS.ANTHROPIC });

export async function AnthropicAPI(chat: ChatSession, streamPipeline: StreamPipeline) {
  let max_tokens: number | undefined;
  let thinking_budget: number | undefined;
  const timestamps = chat.files.map((file) => file.timestamp);
  let inputMessages: (Messages[number] & { timestamp?: number })[];
  inputMessages = chat.messages.map(({ role, content, timestamp }) => {
    assert(timestamp, "Timestamp not found");
    assert(content, "Content not found");
    if (timestamps.includes(timestamp)) {
      return {
        role: role === Role.User ? "user" : "assistant",
        content: [
          {
            type: "text",
            text: content,
          },
        ],
      };
    } else {
      return {
        role: role === Role.User ? "user" : "assistant",
        content: content,
      };
    }
  });

  // 5mb image limit; 32mb pdf and 100 pages
  if (chat.files?.length > 0) {
    for (const file of chat.files) {
      const filePath = getStoredFilePath(file);
      const arrayBuffer = fs.readFileSync(filePath);
      assert(arrayBuffer !== undefined, "File not found");
      const base64: string | undefined = arrayBuffer.toString("base64");
      const inputMessage = inputMessages.find((msg) => msg.timestamp === file.timestamp);
      assert(["pdf"].includes(file.extension), `File type ${file.extension} not supported`);
      assert(Array.isArray(inputMessage?.content), "Content was not converted to an array");
      inputMessage?.content.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: base64,
        },
      });
      file.status = FileStatus.Staged;
    }
  }
  inputMessages = inputMessages.map(({ timestamp, ...msg }) => msg); // remove timestamp attribute

  switch (chat.reasoning) {
    case ReasoningLevel.None:
      thinking_budget = 0;
      max_tokens = 16000;
      break;
    case ReasoningLevel.Low:
      thinking_budget = 8000;
      max_tokens = 16000;
      break;
    case ReasoningLevel.Medium:
      thinking_budget = 20000;
      max_tokens = 40000;
      break;
    case ReasoningLevel.High:
      thinking_budget = 30000;
      max_tokens = 62000; // max limit is now 64000 for 3.7 but restricted to avoid api overload
      break;
    default:
      thinking_budget = 20000;
      max_tokens = 40000;
      break;
  }

  const request: AnthropicRequest = {
    model: chat.model,
    system: chat.instructions,
    messages: inputMessages,
    max_tokens: max_tokens,
    tools: chat.tools?.includes("web")
      ? [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 100, // change this later to allow more research on certain topics (generally aligned with thinking?)
        },
      ]
      : undefined,
    // temperature: chat.temperature ?? 0.6,
    stream: true,
    // tools: web search
    // https://docs.anthropic.com/en/docs/build-with-claude/tool-use/web-search-tool
  };

  if (
    // chat.model === "claude-3-7-sonnet-latest" &&
    chat.reasoning &&
    ["low", "medium", "high"].includes(chat.reasoning)
  ) {
    request.thinking = {
      type: "enabled",
      budget_tokens: thinking_budget,
    };
  } else if (chat.model === "claude-3-5-haiku-latest") {
    request.max_tokens = 8100; // limit is 8182
  }

  let thinking: boolean = false;
  let searching: boolean = false;
  let streaming: boolean = false;
  let citation_num: number = 0;
  let citations: Record<number, Citation> = {};
  let msgID: string = "";
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;

  const stream = client.messages.stream(request as MessageCreateParamsBase);

  for await (const chunk of stream) {
    if (chunk.type === 'message_start') {
      streamPipeline({ apiStatus: 'queued' })
      msgID = chunk.message.id;
      inputTokens = chunk.message.usage.input_tokens;
    } else if (chunk.type === 'content_block_start' && chunk.content_block.type === 'thinking') {
      thinking = true;
      showToast({ title: 'Thinking', style: Toast.Style.Animated })
      streamPipeline({ apiStatus: 'in_progress', apiResponse: `\`\`\`\n` })
    } else if (chunk.type === 'content_block_delta' && chunk.delta.type === 'thinking_delta') {
      streamPipeline({ apiStatus: 'in_progress', apiResponse: chunk.delta.thinking })
    } else if (chunk.type === 'content_block_stop' && thinking) {
      thinking = false;
      streamPipeline({ apiStatus: 'in_progress', apiResponse: `\n\`\`\`\n\n` })
    } else if (chunk.type === 'content_block_start' && chunk.content_block.type === 'server_tool_use') {
      searching = true;
      showToast({ title: 'Searching...', style: Toast.Style.Animated })
      // add input json later?
    } else if (chunk.type === 'content_block_stop' && searching) {
      searching = false;
      // remove toast (persistent)?
    } else if (chunk.type === 'content_block_start' && chunk.content_block.type === 'text' && !chunk.content_block.citations) {
      if (!streaming) {
        streamPipeline({ apiStatus: 'reset' })
        showToast({ title: 'Streaming', style: Toast.Style.Animated })
      }
      streaming = true;
    } else if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      streamPipeline({ apiStatus: 'in_progress', apiResponse: chunk.delta.text })
    } else if (chunk.type === 'content_block_delta' && chunk.delta.type === 'citations_delta') {
      citation_num += 1;
      citations[citation_num] = chunk.delta.citation as Citation;
      streamPipeline({ apiStatus: 'in_progress', apiResponse: `[^${citation_num}]` })
    } else if (chunk.type === 'message_delta') {
      outputTokens = chunk.usage.output_tokens;
      if (citation_num > 0) {
        streamPipeline({
          apiStatus: 'in_progress',
          apiResponse: `\n\n---\n\n## Citations\n\n${Object.entries(citations).map(([key, value]) =>
            `[[^${key}]](${value.url}):` + value.cited_text + `\n\n`
          )}`
        })
      }
    } else if (chunk.type === 'message_stop') {
      streamPipeline({
        apiResponse: "",
        apiStatus: "completed",
        responseID: msgID,
        promptTokens: inputTokens,
        responseTokens: outputTokens,
      });
      break
    }
  }
}
