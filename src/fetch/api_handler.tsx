import * as OpenAPI from './openAI';
import { AnthropicAPI } from './anthropic';
import * as DeepmindAPI from './deepmind';
import { OpenRouter } from './openRouter';
import * as GrokAPI from './grok';
import { PplxAPI } from './perplexity';

import { type Data } from "../utils/types";
import { type StreamPipeline } from "../answer";


export async function APIHandler(data: Data, streamPipeline: StreamPipeline) {
  switch (data.api) {
    case 'openai':
      if (data.model !== 'gpt-4o-transcribe') {
        await OpenAPI.Responses(data, streamPipeline);
      } else {
        await OpenAPI.Transcribe(data, streamPipeline);
      }
      break;
    case 'anthropic':
      await AnthropicAPI(data, streamPipeline);
      break;
    case 'deepmind':
      // await DeepmindAPI.RunOpenAI(data, streamPipeline);
      await DeepmindAPI.RunGoogle(data, streamPipeline);
      break;
    case 'openrouter':
      await OpenRouter(data, streamPipeline);
      break;
    case 'grok':
      await GrokAPI.RunChat(data, streamPipeline);
      break;
    case 'perplexity':
      await PplxAPI(data, streamPipeline);
      break;
  }
}
