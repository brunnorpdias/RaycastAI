export const APItoModels = {
  'openai': [
    { name: 'GPT 4o Latest', code: 'chatgpt-4o-latest' },
    { name: 'GPT 4o', code: 'gpt-4o' },
    { name: 'o3 mini', code: 'o3-mini' },
    { name: 'o1', code: 'o1' },
    { name: 'GPT 4.5', code: 'gpt-4.5-preview' },
    { name: 'GPT 4o Transcribe', code: 'gpt-4o-transcribe' },
    // { name: 'Whisper', code: 'whisper-1' },
    // { name: 'GPT 4o Search', code: 'gpt-4o-search-preview' },  // no support through responses api
    // { name: 'GPT 4o Mini', code: 'gpt-4o-mini' },
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

export const reasoningModels = ['o3-mini', 'o1', 'claude-3-7-sonnet-latest'];
export const sttModels = ['gpt-4o-transcribe'];
export const ttsModels = ['gpt-4o-mini-tts'];
export const attachmentModels = ['gpt-4.5-preview', 'o1', 'chatgpt-4o-latest', 'gpt-4o',
  'gemini-2.0-flash', 'gemini-2.5-pro-preview-03-25',
  'gemini-2.0-flash-thinking-exp-01-21', 'claude-3-7-sonnet-latest'];
export const toolSupportModels = ['gpt-4o', 'o1', 'gpt-4.5-preview'];

export type API = keyof typeof APItoModels;

export type Model = typeof APItoModels[API][number]['code'];

export type Data = {
  timestamp: number;
  messages: Array<{
    id?: string,
    timestamp: number,
    role: 'user' | 'assistant' | 'system' | 'model',
    tokenCount?: number,
    content: string | Array<{  // change this formatting, this is irrelevant for storing purposes
      type: 'text' | 'file' | 'image' | 'document' | 'input_text' | 'input_file' | 'input_image',
      source?: object,
      text?: string,
      file?: object
    }>,
    fileData?: Array<{ fileUri: string, mimeType: 'application/pdf' }>
  }>;
  model: Model;
  api: API;
  instructions: string;
  tools?: string;
  reasoning: 'none' | 'low' | 'medium' | 'high';
  attachments: Array<{
    id?: string,
    status: 'idle' | 'staged' | 'uploaded',
    name: string,
    extension: string,
    path: string,
  }>;
  temperature: number;
  private?: boolean;
};
