import * as OpenAPI from "../fetch/openAI";
import { AnthropicAPI } from "../fetch/anthropic";
import * as DeepmindAPI from "../fetch/deepmind";
import { OpenRouter } from "../fetch/openRouter";
import * as Ollama from "../fetch/ollama";

import { type ChatSession } from "./models";
import { type StreamPipeline } from "../views/answer";
import { sttModels } from "./models";

export async function APIHandler(chat: ChatSession, streamPipeline: StreamPipeline) {
  switch (chat.api) {
    case "openai":
      if (sttModels.includes(chat.model)) {
        await OpenAPI.STT(chat, streamPipeline);
      } else if (chat.workflowStage === "chat_processing") {
        await OpenAPI.Responses(chat, streamPipeline);
      }
      break;
    case "anthropic":
      await AnthropicAPI(chat, streamPipeline);
      break;
    case "deepmind":
      await DeepmindAPI.RunGoogle(chat, streamPipeline);
      break;
    case "openrouter":
      await OpenRouter(chat, streamPipeline);
      break;
    case "ollama":
      await Ollama.Run(chat, streamPipeline);
      break;
  }
}
