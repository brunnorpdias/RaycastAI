import path from 'path';
import { homedir } from 'os';

export const APItoModels = {
  'deepmind': [
    { name: 'Gemini 2.5 Flash', code: 'gemini-2.5-flash-preview-05-20' },
    { name: 'Gemini 2.5 Pro', code: 'gemini-2.5-pro-preview-06-05' },
  ],
  'openai': [
    { name: 'GPT 4.1', code: 'gpt-4.1' },
    { name: 'GPT 4.1 mini', code: 'gpt-4.1-mini' },
    { name: 'o3 Pro', code: 'o3-pro' },
    { name: 'o3', code: 'o3' },
    { name: 'o4 mini', code: 'o4-mini' },
    { name: 'GPT 4o STT', code: 'gpt-4o-transcribe' },
    // { name: 'GPT 4o TTS', code: 'gpt-4o-mini-tts' },
  ],
  'anthropic': [
    { name: 'Claude 4 Sonnet', code: 'claude-sonnet-4-20250514' },
    { name: 'Claude 4 Opus', code: 'claude-opus-4-20250514' },
  ],
  'openrouter': [
    { name: 'Grok 3', code: 'x-ai/grok-3-beta' },
    { name: 'Perplexity Sonar Pro', code: 'perplexity/sonar-reasoning-pro' },
    { name: 'DeepSeek Prover V2', code: 'deepseek/deepseek-prover-v2' },
    { name: 'Sonar Deep Research', code: 'perplexity/sonar-deep-research' },
    { name: 'GPT 4o', code: 'openai/chatgpt-4o-latest' },
    { name: 'Gemini 2.5 Flash', code: 'google/gemini-2.5-flash-preview' },
    { name: 'Gemini 2.5 Pro', code: 'google/gemini-2.5-pro-preview-03-25' },
    { name: 'Claude 3.7 Sonnet', code: 'anthropic/claude-3.7-sonnet' },
  ],
  'ollama': [
    { name: 'Gemma 3 12b', code: 'gemma3:12b-it-qat' },
    { name: 'Gemma 3 27b', code: 'gemma3:27b-it-qat' },
    { name: 'Qwen 3 8b', code: 'qwen3:8b' },
    { name: 'Qwen 3 14b', code: 'qwen3:14b' },
    { name: 'Qwen 3 32b', code: 'qwen3:32b' },
  ]
};

export const reasoningModels = ['o4-mini', 'o3', 'o3-pro', 'claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'gemini-2.5-flash-preview-05-20', 'gemini-2.5-pro-preview-06-05']// 'qwen3:8b', 'qwen3:14b', 'qwen3:32b'];
export const attachmentModels = ['o3', 'o3-pro', 'o4-mini', 'chatgpt-4o-latest', 'gpt-4.1-mini', 'gpt-4.1',
  'gemini-2.5-flash-preview-05-20', 'gemini-2.5-pro-preview-06-05',
  'claude-sonnet-4-20250514', 'claude-opus-4-20250514'
];
export const toolSupportModels = ['gpt-4.1-mini', 'gpt-4.1',
  'claude-sonnet-4-20250514', 'claude-opus-4-20250514',
  'gemini-2.5-flash-preview-05-20', 'gemini-2.5-pro-preview-06-05'
];
export const privateModeAPIs = ['openai', 'deepmind'];  // deprecate
export const sttModels = ['gpt-4o-transcribe'];
export const ttsModels = ['gpt-4o-mini-tts'];

export const storageDir = path.join(homedir(), 'Code/Projects/RaycastAI/storage/');

export type API = keyof typeof APItoModels;

export type Model = typeof APItoModels[API][number]['code'];

export type Data = {
  timestamp: number;
  messages: Array<{
    id?: string,  // response id on openai
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
  // private?: boolean;
};

export type FileData = {
  hash: string,
  rawData: number[]
};
