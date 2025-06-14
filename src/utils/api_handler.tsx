import * as OpenAPI from '../fetch/openAI';
import { AnthropicAPI } from '../fetch/anthropic';
import * as DeepmindAPI from '../fetch/deepmind';
import { OpenRouter } from '../fetch/openRouter';
import * as Ollama from '../fetch/ollama';

import { type Data } from "../utils/types";
import { type StreamPipeline } from "../views/answer";
import { sttModels } from '../utils/types';


export async function APIHandler(data: Data, streamPipeline: StreamPipeline) {
  switch (data.api) {
    case 'openai':
      if (sttModels.includes(data.model)) {
        await OpenAPI.STT(data, streamPipeline);
      } else {
        await OpenAPI.Responses(data, streamPipeline);
      }
      break
    case 'anthropic':
      await AnthropicAPI(data, streamPipeline);
      break
    case 'deepmind':
      await DeepmindAPI.RunGoogle(data, streamPipeline);
      break
    case 'openrouter':
      await OpenRouter(data, streamPipeline);
      break
    case 'ollama':
      await Ollama.Run(data, streamPipeline);
      break
  }
}
