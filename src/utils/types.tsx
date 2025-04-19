export const APItoModels = {
  'openai': [
    { name: 'GPT 4.1 mini', code: 'gpt-4.1-mini' },
    { name: 'GPT 4.1', code: 'gpt-4.1' },
    { name: 'GPT 4o Latest', code: 'chatgpt-4o-latest' },
    { name: 'o4 mini', code: 'o4-mini' },
    { name: 'o3', code: 'o3' },
    { name: 'GPT 4o Transcribe', code: 'gpt-4o-transcribe' },
    // { name: 'GPT 4o TTS', code: 'gpt-4o-mini-tts' },
  ],
  'deepmind': [
    { name: 'Gemini 2.0 Flash', code: 'gemini-2.0-flash' },
    { name: 'Gemini 2.0 Flash Thinking Experimental', code: 'gemini-2.0-flash-thinking-exp-01-21' },
    { name: 'Gemini 2.5 Pro', code: 'gemini-2.5-pro-preview-03-25' },
  ],
  'anthropic': [
    { name: 'Claude 3.7 Sonnet', code: 'claude-3-7-sonnet-latest' },
    { name: 'Claude 3.5 Haiku', code: 'claude-3-5-haiku-latest' },
  ],
  'openrouter': [
    { name: 'Gemini 2.0 Flash', code: 'google/gemini-2.0-flash-001' },
    { name: 'Gemini 2.5 Pro', code: 'google/gemini-2.5-pro-preview-03-25' },
    { name: 'GPT 4o', code: 'openai/chatgpt-4o-latest' },
    { name: 'Claude 3.7 Sonnet', code: 'anthropic/claude-3.7-sonnet' },
    { name: 'Perplexity Sonar Pro', code: 'perplexity/sonar-reasoning-pro' },
    { name: 'Sonar Deep Research', code: 'perplexity/sonar-deep-research' },
  ],
} as const;

export const reasoningModels = ['o4-mini', 'o3', 'claude-3-7-sonnet-latest'];
export const sttModels = ['gpt-4o-transcribe'];
export const ttsModels = ['gpt-4o-mini-tts'];
export const attachmentModels = ['o3', 'o4-mini', 'chatgpt-4o-latest', 'gpt-4.1-mini', 'gpt-4.1',
  'gemini-2.0-flash', 'gemini-2.5-pro-preview-03-25',
  'gemini-2.0-flash-thinking-exp-01-21', 'claude-3-7-sonnet-latest'];
export const toolSupportModels = ['gpt-4o', 'o3', 'o4-mini', 'gpt-4.1-mini', 'gpt-4.1'];

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
    timestamp: number,
    status: 'idle' | 'staged' | 'uploaded',
    path: string,
    base64String?: string,
    size?: number,
  }>;
  private?: boolean;
};
