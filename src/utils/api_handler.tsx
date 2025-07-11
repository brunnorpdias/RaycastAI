import * as OpenAPI from '../fetch/openAI';
import { AnthropicAPI } from '../fetch/anthropic';
import * as DeepmindAPI from '../fetch/deepmind';
import { OpenRouter } from '../fetch/openRouter';
import * as Ollama from '../fetch/ollama';

import { type Data } from "./models";
import { type StreamPipeline } from "../views/answer";
import { sttModels } from './models';


export async function APIHandler(data: Data, streamPipeline: StreamPipeline) {
  switch (data.api) {
    case 'openai':
      if (sttModels.includes(data.model)) {
        await OpenAPI.STT(data, streamPipeline);
      } else if (data.workflowState === 'chat_processing') {
        await OpenAPI.Responses(data, streamPipeline);
        // } else if (data.workflowState === 'dr_clarifying') {
      } else if (data.workflowState && ['dr_clarifying', 'dr_improving_prompt'].includes(data.workflowState)) {
        await OpenAPI.DeepResearchImprovements(data, streamPipeline)
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
