import path from 'path';
import { homedir } from 'os';

export const APItoModels = {
  'deepmind': [
    { name: 'Gemini 2.5 Flash', code: 'gemini-2.5-flash-preview-04-17' },
    { name: 'Gemini 2.5 Pro', code: 'gemini-2.5-pro-preview-03-25' },
  ],
  'openai': [
    { name: 'GPT 4.1 mini', code: 'gpt-4.1-mini' },
    { name: 'GPT 4.1', code: 'gpt-4.1' },
    { name: 'o3', code: 'o3' },
    { name: 'o4 mini', code: 'o4-mini' },
    { name: 'GPT 4o STT', code: 'gpt-4o-transcribe' },
    // { name: 'GPT 4o TTS', code: 'gpt-4o-mini-tts' },
  ],
  'anthropic': [
    { name: 'Claude 3.7 Sonnet', code: 'claude-3-7-sonnet-latest' },
    { name: 'Claude 3.5 Haiku', code: 'claude-3-5-haiku-latest' },
  ],
  'openrouter': [
    { name: 'Grok 3', code: 'x-ai/grok-3-beta' },
    { name: 'Perplexity Sonar Pro', code: 'perplexity/sonar-reasoning-pro' },
    { name: 'Sonar Deep Research', code: 'perplexity/sonar-deep-research' },
    { name: 'GPT 4o', code: 'openai/chatgpt-4o-latest' },
    { name: 'Gemini 2.5 Flash', code: 'google/gemini-2.5-flash-preview' },
    { name: 'Gemini 2.5 Pro', code: 'google/gemini-2.5-pro-preview-03-25' },
    { name: 'Claude 3.7 Sonnet', code: 'anthropic/claude-3.7-sonnet' },
  ],
  // add gemma via Ollama on premise
  // https://x.com/googleaidevs/status/1913219776656089184
};

export const reasoningModels = ['o4-mini', 'o3', 'claude-3-7-sonnet-latest'];
export const sttModels = ['gpt-4o-transcribe'];
export const ttsModels = ['gpt-4o-mini-tts'];
export const attachmentModels = ['o3', 'o4-mini', 'chatgpt-4o-latest', 'gpt-4.1-mini', 'gpt-4.1',
  'gemini-2.5-flash-preview-04-17', 'gemini-2.5-pro-preview-03-25',
  'claude-3-7-sonnet-latest'];
export const toolSupportModels = ['gpt-4o', 'o3', 'o4-mini', 'gpt-4.1-mini', 'gpt-4.1'];
export const privateModeAPIs = ['openai', 'deepmind'];

export const storageDir = path.join(homedir(), 'Code/Projects/RaycastAI/storage/');

export type API = keyof typeof APItoModels;

export type Model = typeof APItoModels[API][number]['code'];

export type Data = {
  timestamp: number;
  messages: Array<{
    id?: string,
    timestamp: number,
    role: 'user' | 'assistant',
    content: string,
    tokenCount?: number,
  }>;
  instructions: string,
  model: Model;
  api: API;
  tools?: string;
  reasoning: 'none' | 'low' | 'medium' | 'high';
  files: Array<{
    id?: string,
    hash: string,
    name: string,
    extension: string,
    timestamp: number,
    status: 'idle' | 'staged' | 'uploaded',
    size?: number,
  }>;
  private?: boolean;
};

export type FileData = {
  hash: string,
  rawData: number[]
};
