import * as OpenAPI from './fetch/openAI';
import { AnthropicAPI } from './fetch/anthropic';
import * as DeepmindAPI from './fetch/deepmind';
import * as GrokAPI from './fetch/grok';
import { PplxAPI } from './fetch/perplexity';

import { type Data } from "./form";
import { type StreamPipeline } from "./answer";


export async function APIHandler(data: Data, streamPipeline: StreamPipeline) {
  switch (data.api) {
    case 'openai':
      await OpenAPI.RunChat(data, streamPipeline);
      break;
    case 'anthropic':
      await AnthropicAPI(data, streamPipeline);
      break;
    case 'deepmind':
      // await DeepmindAPI.RunOpenAI(data, streamPipeline);
      await DeepmindAPI.RunGoogle(data, streamPipeline);
      break;
    case 'grok':
      await GrokAPI.RunChat(data, streamPipeline);
      break;
    case 'perplexity':
      await PplxAPI(data, streamPipeline);
      break;
  }
}
