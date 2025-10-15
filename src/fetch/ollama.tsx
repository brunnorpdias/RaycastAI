import ollama from "ollama";
import assert from "assert";

import { ChatSession, Role } from "../utils/models";
import { type StreamPipeline } from "../views/answer";

// remove optionals later
export async function Run(chat: ChatSession, streamPipeline: StreamPipeline) {
  const messages = chat.messages.map(({ role, content }) => {
    assert(content, "Content wasn't found");
    return {
      role: role === Role.User ? "user" : "assistant",
      content: content,
    };
  });

  const response = await ollama.chat({
    model: chat?.model ?? "gemma3:12b",
    messages: messages ?? [{ role: "user", content: "This is a test" }],
    stream: true,
    // set thinking budget for specific models
  });

  for await (const event of response) {
    if (event.message.content === "<think>") {
      streamPipeline({ apiResponse: "## Thinking mode\n", apiStatus: "in_progress" });
    } else if (event.message.content === "</think>") {
      streamPipeline({ apiResponse: "", apiStatus: "reset" });
    } else if (!event.done) {
      streamPipeline({ apiResponse: event.message.content, apiStatus: "in_progress" });
    } else {
      streamPipeline({ apiResponse: "", apiStatus: "completed" });
    }
  }
}
