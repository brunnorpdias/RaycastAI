import * as OpenAPI from './fetch/openAI';
import { AnthropicAPI } from './fetch/anthropic';
import * as DeepmindAPI from './fetch/deepmind';
import { GroqAPI } from './fetch/groq';
import * as GrokAPI from './fetch/grok';
import { PplxAPI } from './fetch/perplexity';
// import * as GoogleOpenAI from './fetch/google_openai';

import { type Data } from "./chat_form";
import { type StreamPipeline } from "./chat_answer";


export async function APIHandler(data: Data, streamPipeline: StreamPipeline) {
  switch (data.api) {
    case 'openai':
      await OpenAPI.RunChat(data, streamPipeline);
      break;
    case 'anthropic':
      await AnthropicAPI(data, streamPipeline);
      break;
    case 'deepmind':
      await DeepmindAPI.RunChat(data, streamPipeline);
      break;
    // case 'google':
    //   await GoogleOpenAI.RunChat(data, streamPipeline);
    //   break;
    case 'groq':
      await GroqAPI(data, streamPipeline);
      break;
    case 'grok':
      await GrokAPI.RunChat(data, streamPipeline);
      break;
    case 'perplexity':
      await PplxAPI(data, streamPipeline);
      break;
  }
}
