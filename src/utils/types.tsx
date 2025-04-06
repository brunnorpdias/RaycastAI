export const APItoModels = {
  'openai': [
    { name: 'GPT 4o', code: 'chatgpt-4o-latest' },
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
    { name: 'GPT 4o', code: 'openai/chatgpt-4o-latest' },
    { name: 'Gemini 2.5 Pro', code: 'google/gemini-2.5-pro-preview-03-25' },
    { name: 'Claude 3.7 Sonnet', code: 'anthropic/claude-3.7-sonnet' },
    { name: 'Gemini 2.0 Flash', code: 'google/gemini-2.0-flash-001' },
  ],
  'perplexity': [
    { name: 'Sonar Deep Research', code: 'sonar-deep-research' },
    { name: 'Sonar Reasoning Pro', code: 'sonar-reasoning-pro' },
    { name: 'Sonar Pro', code: 'sonar-pro' },
    { name: 'Sonar', code: 'sonar' },
  ],
  'grok': [
    { name: 'Grok 2', code: 'grok-2-latest' },
  ],
} as const;

export const reasoningModels: Model[] = ['o3-mini', 'o1', 'claude-3-7-sonnet-latest'];
export const transcriptionModels: Model[] = ['gpt-4o-transcribe'];
export const attachmentModels: Model[] = ['gpt-4.5-preview', 'o1', 'chatgpt-4o-latest',
  'gemini-2.0-flash', 'gemini-2.5-pro-preview-03-25',
  'gemini-2.0-flash-thinking-exp-01-21', 'claude-3-7-sonnet-latest'];
export const toolSupportModels: Model[] = ['chatgpt-4o-latest', 'o1', 'gpt-4.5-preview'];

export type API = keyof typeof APItoModels;

export type Model = typeof APItoModels[API][number]['code'];

export type Data = {
  timestamp: number;
  messages: Array<{
    id?: string,
    timestamp: number,
    role: 'user' | 'assistant' | 'system',
    content: string | Array<{  // change this formatting, this is irrelevant for storing purposes
      type: 'text' | 'file' | 'image' | 'document' | 'input_text' | 'input_file' | 'input_image',
      source?: object,
      text?: string,
      file?: object
    }>,
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
