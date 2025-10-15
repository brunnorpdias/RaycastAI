import { showToast, Toast } from "@raycast/api";

import OpenAI from "openai";
import fs from "fs";
import path from "path";
import os from "os";

import { API_KEYS } from "../config/api_keys";
import { ChatSession, Role, ReasoningLevel, FileStatus, reasoningModels } from "../utils/models";
import { getStoredFilePath } from "../utils/storage";
import { type StreamPipeline } from "../views/answer";
import { ResponseCreateParamsStreaming, ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";
import assert from "assert";

type OpenAIRole = "user" | "assistant" | "system";

type Input = Array<{
  role: OpenAIRole;
  content: Content;
  timestamp?: number;
}>;

type Content =
  | string
  | Array<{
    type: "input_text" | "input_file" | "input_image";
    text?: string;
    filename?: string;
    image_url?: string;
    file_id?: string;
    file_data?: string;
    detail?: "low" | "high" | "auto";
  }>;

type ContentItem = Exclude<Content, string>[number];

type FileTypeConfig = {
  mimeType: string;
  type: ContentItem["type"];
  defaultDetail?: "low" | "high" | "auto";
};

const FILE_TYPE_CONFIG: Record<string, FileTypeConfig> = {
  pdf: { mimeType: "application/pdf", type: "input_file" },
  doc: { mimeType: "application/msword", type: "input_file" },
  docx: {
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    type: "input_file",
  },
  pptx: {
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    type: "input_file",
  },
  txt: { mimeType: "text/plain", type: "input_file" },
  md: { mimeType: "text/markdown", type: "input_file" },
  json: { mimeType: "application/json", type: "input_file" },
  js: { mimeType: "text/javascript", type: "input_file" },
  ts: { mimeType: "application/typescript", type: "input_file" },
  css: { mimeType: "text/css", type: "input_file" },
  html: { mimeType: "text/html", type: "input_file" },
  c: { mimeType: "text/x-c", type: "input_file" },
  cpp: { mimeType: "text/x-c++", type: "input_file" },
  cs: { mimeType: "text/x-csharp", type: "input_file" },
  go: { mimeType: "text/x-golang", type: "input_file" },
  java: { mimeType: "text/x-java", type: "input_file" },
  py: { mimeType: "text/x-python", type: "input_file" },
  rb: { mimeType: "text/x-ruby", type: "input_file" },
  php: { mimeType: "text/x-php", type: "input_file" },
  sh: { mimeType: "application/x-sh", type: "input_file" },
  tex: { mimeType: "text/x-tex", type: "input_file" },
  jpg: { mimeType: "image/jpeg", type: "input_image", defaultDetail: "auto" },
  png: { mimeType: "image/png", type: "input_image", defaultDetail: "auto" },
  gif: { mimeType: "image/gif", type: "input_image", defaultDetail: "auto" },
  webp: { mimeType: "image/webp", type: "input_image", defaultDetail: "auto" },
};

const openai = new OpenAI({ apiKey: API_KEYS.OPENAI });


export async function Responses(chat: ChatSession, streamPipeline: StreamPipeline) {
  const input: Input = await GenerateInput(chat);
  const inputWithFiles: Input = await AddFiles(chat, input);
  const responsesObject = (await ResponsesObject(chat, inputWithFiles)) as ResponseCreateParamsStreaming;
  GenerateStreaming(responsesObject, streamPipeline, chat);
}


export async function TitleConversation(chat: ChatSession) {
  let input: Input = await GenerateInput(chat);
  input = input.map(({ timestamp, ...rest }) => rest); // remove timestamps from the messages (used to match files on responses)
  assert(Array.isArray(input), "Input has an incorrect format");
  input.push({
    role: "user",
    content:
      "Give a short and descriptive title to the chat without mentioning so or using special characters. The title must describe the intention of the user.",
  });
  const responsesObject = {
    input: input,
    model: "gpt-4.1-mini",
    stream: false,
  };
  showToast({ title: "Creating a title", style: Toast.Style.Animated });
  const response = await openai.responses.create(responsesObject as ResponseCreateParamsNonStreaming);
  showToast({ title: "Title created" });
  return response.output_text;
}


export async function STT(chat: ChatSession, streamPipeline: StreamPipeline) {
  const lastMsg = chat.messages.at(-1);
  if (!lastMsg) return;
  const prompt: string = lastMsg.content ?? "";
  const file = chat.files.at(0);
  assert(file !== undefined, "File was not found");
  const filePath = getStoredFilePath(file);
  const stream = await openai.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: "gpt-4o-transcribe",
    prompt: prompt,
    response_format: "json", //  "text",
    stream: true,
  });

  let isStreaming = false;
  for await (const event of stream) {
    if (event.type === "transcript.text.delta") {
      streamPipeline({
        apiResponse: event.delta,
        apiStatus: "in_progress",
      });

      if (!isStreaming) {
        isStreaming = true;
        showToast({ title: "Streaming", style: Toast.Style.Animated });
      }
    } else if (event.type === "transcript.text.done") {
      streamPipeline({
        apiResponse: "",
        apiStatus: "completed",
      });
    } else {
      showToast({ title: "Encountered unexpected event", style: Toast.Style.Failure });
    }
  }
}


export async function TTS(text: string) {
  const speechFile = path.resolve(os.homedir(), "Downloads", "RaycastAI_speech.wav");

  try {
    showToast({ title: "Generating Audio", style: Toast.Style.Animated });
    const audio = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: text,
      response_format: "wav",
      // instructions: "Speak in a cheerful and positive tone.",
    });
    const buffer = Buffer.from(await audio.arrayBuffer());
    await fs.promises.writeFile(speechFile, buffer);
    if (buffer) showToast({ title: "Audio is ready", style: Toast.Style.Success });
  } catch (err) {
    showToast({ title: "Error generating audio", style: Toast.Style.Failure });
  }
}


//  Helper Functions  //
async function GenerateInput(chat: ChatSession) {
  const timestamps: number[] = chat.files.map((file) => file.timestamp);
  let input: Input;

  if (chat.files.length === 0) {
    input = chat.messages.map(({ role, content }) => {
      assert(content, "Message content not found");
      return {
        content: content,
        role: role === Role.User ? "user" : ("assistant" as OpenAIRole),
      };
    });
  } else {
    input = chat.messages.map(({ role, content, timestamp }) => {
      assert(content, "Message content not found");
      if (role === Role.User && timestamp && timestamps.includes(timestamp)) {
        return {
          role: Role.User,
          content: [{ type: "input_text", text: content }],
          timestamp: timestamp,
        };
      } else {
        return {
          role: role === Role.User ? "user" : ("assistant" as OpenAIRole),
          content: content,
        };
      }
    });
  }

  return input;
}


async function AddFiles(chat: ChatSession, input: Input) {
  if (chat.files.length < 1) return input;
  let inputWithFiles = [...input];
  assert(chat.private, 'File is not private')

  // for (const file of fileQueue) {
  for (const file of chat.files) {
    const inputItem: Input[number] | undefined = inputWithFiles.find((item) => item.timestamp === file.timestamp);
    const filePath = getStoredFilePath(file);
    const fileType = FILE_TYPE_CONFIG[file.extension].type;
    let fileID;

    // Check if the uploaded file is expired and change of status
    if (file.status === FileStatus.Uploaded) {
      fileID = file.id;
      assert(fileID, 'File ID not found')
      const retrievedFile = await openai.files.retrieve(fileID);
      const expiration = Math.round(Date.now() / 1000) + 100;  // 100 seconds is the grace period
      if (retrievedFile.expires_at && (retrievedFile.expires_at < expiration)) {
        file.status = FileStatus.Idle;
      }
    }

    // Upload file
    if (file.status !== FileStatus.Uploaded) {
      const fileUpload = await openai.files.create({
        file: fs.createReadStream(filePath),
        purpose: 'user_data',
        expires_after: chat.private ? {
          anchor: 'created_at',
          seconds: 15 * (24 * 60 ** 2)
        } :
          undefined
      })
      fileID = fileUpload.id;
      file.status = FileStatus.Uploaded;
      file.id = fileID;
    }

    // Attach file to the input variable
    const attachment: ContentItem = {
      type: fileType,
      file_id: fileID
    }
    assert(Array.isArray(inputItem?.content), "Input wasn't converted to an array");
    inputItem?.content.push(attachment)

    // - [x] check for file status
    // - [x] upload files
    // - [x] add option for expiration on private mode
    // - [x] mount files to input
    // - [x] check if file is still on server
    // - [ ] add option for pdf using private mode
    // add toast for file uploads
    // use vector files and file search instead?
  }

  inputWithFiles = inputWithFiles.map(({ timestamp, ...rest }) => rest);
  return inputWithFiles;
}


async function ResponsesObject(chat: ChatSession, input: Input) {
  const max_output_tokens = reasoningModels.includes(chat.model) ? 100000 : 32000;
  const token_divider =
    chat.reasoning === ReasoningLevel.Low
      ? 4
      : chat.reasoning === ReasoningLevel.Medium
        ? 2
        : chat.reasoning === ReasoningLevel.High
          ? 1
          : undefined;

  const tools = [];
  if (chat.tools?.includes("web")) {
    tools.push({
      type: "web_search",
      user_location: {
        type: "approximate",
        country: "GB",
        city: "London",
        region: "London",
      },
    });
  }
  if (chat.tools?.includes("code")) {
    tools.push({
      type: "code_interpreter",
      container: { type: "auto" },
    });
  }

  const responsesObject = {
    input: input,
    model: chat.model,
    instructions: chat.instructions.length > 0 ? chat.instructions : undefined,
    reasoning: chat.reasoning
      ? {
        effort: chat.reasoning === ReasoningLevel.None ? "minimal" : chat.reasoning,
        summary: "detailed",
      }
      : undefined,
    tools: tools,
    max_output_tokens: token_divider ? max_output_tokens / token_divider : undefined,
    stream: true,
    temperature: chat.temperature,
    store: chat.private ? false : true,
    // use openai's conversations to manage conversations on server?
  };

  return responsesObject;
}


async function GenerateStreaming(
  responsesObject: ResponseCreateParamsStreaming,
  streamPipeline: StreamPipeline,
  chat: ChatSession,
) {
  const stream = await openai.responses.create(responsesObject);
  for await (const event of stream) {
    console.log(JSON.stringify(event));
    if (event.type === "response.queued") {
      streamPipeline({ apiStatus: event.response.status, responseID: event.response.id });
      showToast({ title: "Request Received", style: Toast.Style.Success });
    } else if (event.type === "response.output_item.added" && event.item.type === "reasoning") {
      showToast({ title: "Thinking...", style: Toast.Style.Animated });
    } else if (event.type === "response.reasoning_summary_text.delta") {
      streamPipeline({ apiStatus: "in_progress", apiResponse: event.delta });
    } else if (event.type === "response.content_part.added") {
      streamPipeline({ apiStatus: "reset" });
      showToast({ title: "Streaming", style: Toast.Style.Animated });
    } else if (event.type === "response.output_text.delta") {
      streamPipeline({ apiStatus: "in_progress", apiResponse: event.delta });
    } else if (event.type === "response.completed") {
      const inputTokens: number | undefined = event.response.usage?.input_tokens;
      const outputTokens: number | undefined = event.response.usage?.output_tokens;
      streamPipeline({
        apiStatus: event.response.status,
        promptTokens: inputTokens,
        responseTokens: outputTokens,
      });
      chat.files.map((att) => (att.status === FileStatus.Staged ? (att.status = FileStatus.Uploaded) : att.status));
      break;
    } else if (event.type === "response.failed" || event.type === "response.incomplete") {
      streamPipeline({ apiStatus: event.response.status });
    }
  }
}
