import { environment } from "@raycast/api";
import fs from "fs";
import path from "path";

const supportStorageDir = path.join(environment.supportPath, "storage");

function ensureStorageDirectory() {
  if (!fs.existsSync(supportStorageDir)) {
    fs.mkdirSync(supportStorageDir, { recursive: true });
  }

  return supportStorageDir;
}

export const storageDir = ensureStorageDirectory();

export const apiDetails = [
  { name: "Open AI", code: "openai", image: "openai-logo.svg" },
  { name: "Deepmind", code: "deepmind", image: "deepmind-icon.png" },
  { name: "Anthropic", code: "anthropic", image: "anthropic-icon.png" },
  { name: "OpenRouter", code: "openrouter", image: "open_router-logo.png" },
  { name: "Ollama", code: "ollama", image: "ollama-icon.png" },
];

export const ApiToModels = {
  openai: [
    { name: "GPT 5", code: "gpt-5" },
    { name: "GPT 5 Mini", code: "gpt-5-mini" },
    { name: "GPT 5 Nano", code: "gpt-5-nano" },
    { name: "GPT 4.1", code: "gpt-4.1" },
    { name: "GPT 4.1 Mini", code: "gpt-4.1-mini" },
    { name: "GPT 4.1 Nano", code: "gpt-4.1-nano" },
    // { name: 'o3', code: 'o3' },
    { name: "GPT 4o STT", code: "gpt-4o-transcribe" },
    // { name: 'GPT 4o TTS', code: 'gpt-4o-mini-tts' },
  ],
  deepmind: [
    { name: "Gemini 2.5 Pro", code: "gemini-pro-latest" },
    { name: "Gemini 2.5 Flash", code: "gemini-flash-latest" },
    { name: "Gemini 2.5 Flash Lite", code: "gemini-flash-lite-latest" },
  ],
  anthropic: [
    { name: "Claude 4.5 Sonnet", code: "claude-sonnet-4-5" },
    { name: "Claude 4 Sonnet", code: "claude-sonnet-4-0" },
    { name: "Claude 4 Opus", code: "claude-opus-4-0" },
    { name: "Claude 4.1 Opus", code: "claude-opus-4-1" },
  ],
  openrouter: [
    { name: "Grok 4", code: "x-ai/grok-4" },
    { name: "Grok 3", code: "x-ai/grok-3" },
    { name: "Perplexity Sonar Pro", code: "perplexity/sonar-reasoning-pro" },
    { name: "DeepSeek Prover V2", code: "deepseek/deepseek-prover-v2" },
    { name: "GPT 4o", code: "openai/chatgpt-4o-latest" },
    { name: "Gemini 2.5 Flash", code: "google/gemini-2.5-flash-preview" },
    { name: "Gemini 2.5 Pro", code: "google/gemini-2.5-pro-preview-03-25" },
    { name: "Claude 3.7 Sonnet", code: "anthropic/claude-3.7-sonnet" },
  ],
  ollama: [
    { name: "Gemma 3 12b", code: "gemma3:12b-it-qat" },
    { name: "Gemma 3 27b", code: "gemma3:27b-it-qat" },
    { name: "Qwen 3 8b", code: "qwen3:8b" },
    { name: "Qwen 3 14b", code: "qwen3:14b" },
    { name: "Qwen 3 32b", code: "qwen3:32b" },
  ],
};

export enum Role {
  User = "user",
  Assistant = "assistant",
}

export enum ReasoningLevel {
  None = "none",
  Low = "low",
  Medium = "medium",
  High = "high",
  // Auto = 'auto',
}

export enum FileStatus {
  Idle = "idle",
  Staged = "staged",
  Uploaded = "uploaded",
}

export type Files =
  | []
  | Array<{
    id?: string;
    hash: string;
    name: string;
    extension: string;
    timestamp: number;
    status: FileStatus;
    size?: number;
  }>;

export type Messages = Array<{
  id?: string; // response id on openai
  timestamp?: number;
  role?: Role;
  content?: string;
  tokenCount?: number;
}>;

export type ApiStatus = "queued" | "in_progress" | "completed" | "cancelled" | "incomplete" | "failed";

export type ChatSession = {
  timestamp: number;
  messages: Messages;
  instructions: string;
  model: Model;
  api: API;
  files: Files;
  tools?: Array<"web" | "code">;
  reasoning?: ReasoningLevel;
  workflowStage?: WorkflowStage;
  apiStatus?: ApiStatus;
  temperature?: number;
  private?: boolean;
};

// export type FileData = {
//   hash: string,
//   rawData: number[]
// };

export type WorkflowStage =
  // chat workflow
  | "chat_queued"
  | "chat_processing" // chat is being processed

  // terminal states
  | "completed" // completed successfully
  | "cancelled" // user aborted; no way to do this yet
  | "failed";

// perhaps i can remove these markers since all current models have these advanced features

// perhaps remove all these requirements if all models have the same capabilities now
export const reasoningModels = [
  "gpt-5",
  "gpt-5-mini",
  "gpt-5-nano",
  "claude-sonnet-4-5",
  "claude-sonnet-4-0",
  "claude-opus-4-0",
  "claude-opus-4-1",
  "gemini-flash-lite-latest",
  "gemini-flash-latest",
  "gemini-pro-latest",
];
export const attachmentModels = [
  "gpt-5",
  "gpt-5-mini",
  "gpt-5-nano",
  "gpt-4.1",
  "claude-sonnet-4-5",
  "claude-sonnet-4-0",
  "claude-opus-4-0",
  "claude-opus-4-1",
  "gemini-flash-lite-latest",
  "gemini-flash-latest",
  "gemini-pro-latest",
];
export const toolModels = [
  "gpt-5",
  "gpt-5-mini",
  "gpt-5-nano",
  "gpt-4.1",
  "claude-sonnet-4-5",
  "claude-sonnet-4-0",
  "claude-opus-4-0",
  "claude-opus-4-1",
  "gemini-flash-lite-latest",
  "gemini-flash-latest",
  "gemini-pro-latest",
];
export const sttModels = ["gpt-4o-transcribe"];
export const ttsModels = ["gpt-4o-mini-tts"];

export type API = keyof typeof ApiToModels;

export type Model = (typeof ApiToModels)[API][number]["code"];

