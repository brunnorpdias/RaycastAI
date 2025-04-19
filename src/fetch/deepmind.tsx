import { showToast, Toast } from "@raycast/api";
// import OpenAI from "openai";
import { GoogleGenAI, createPartFromUri } from "@google/genai";
import fs from 'fs';

import { API_KEYS } from '../enums/api_keys';

// import { ChatCompletionChunk } from "openai/resources";
import { type Data } from "../utils/types";
import { type StreamPipeline } from "../views/answer";
import assert from "assert";

type InputMessages = Array<{
  role?: 'user' | 'model',
  parts?: Array<{ text?: string, inlineData?: { mimeType: string, data: string } }>,
  fileData?: FileData,
}>

type FileData = { fileUri: string, mimeType: 'application/pdf' }


export async function RunGoogle(data: Data, streamPipeline: StreamPipeline) {
  // port summarisation and title creation to gemini 2.0 flash
  // add code execution, pdf, files, and thinking
  const deepmind = new GoogleGenAI({ apiKey: API_KEYS.DEEPMIND })
  let inputMessages: InputMessages = data.messages
    .filter(msg => msg.role !== 'system')
    .map(({ timestamp, id, tokenCount, ...rest }) => {
      return {
        role: rest.role === 'assistant' || rest.role === 'model' ? 'model' : 'user',
        parts: [
          { text: typeof rest.content === 'string' ? rest.content : rest.content[0].text || '' },
          // { inlineData: rest.inlineData ?? undefined },
        ],
      }
    }) as InputMessages;

  const attachmentsQueue = data.attachments.filter(({ status }) => status !== 'uploaded')
  let lastMsg: Data["messages"][number] | undefined = data.messages.at(-1)
  assert(lastMsg !== undefined, "Data doesn't contain messages")
  for (const attachment of attachmentsQueue) {
    // check if files are larger than 20mb and file type
    const arrayBuffer = fs.readFileSync(attachment.path);
    const parts = inputMessages.at(-1)?.parts
    if (data.private) {
      assert(parts !== undefined, 'Input messages is empty or doesn\'t contain "parts" attribute')
      const base64String = arrayBuffer.toString('base64');
      const inlineDatum = { inlineData: { mimeType: 'application/pdf', data: base64String } }
      parts.push(inlineDatum)
      attachment.status = 'staged';
      // update local data
      lastMsg = inputMessages
      if (lastMsg.inlineData) {
        lastMsg.inlineData.push(inlineDatum)
      } else {
        lastMsg.inlineData = [inlineDatum]
      }
    } else {
      const fileBlob = new Blob([arrayBuffer], { type: 'application/pdf' });
      const file = await deepmind.files.upload({
        file: fileBlob,
        config: { displayName: attachment.name },
      })

      try {
        assert(file.uri && file.mimeType, 'error')
        const fileData: FileData = createPartFromUri(file.uri, file.mimeType) as FileData;
        inputMessages.push(fileData as InputMessages[number])  // used coercion, don't know how to solve otherwise
        attachment.status = 'staged';
        showToast({ title: `File ${attachment.name} uploaded`, style: Toast.Style.Success })
        // update local data
        if (lastMsg.fileData) {
          lastMsg.fileData.push(fileData)
        } else {
          lastMsg.fileData = [fileData]
        }
      } catch (err) {
        showToast({ title: `Error uploading ${attachment.name}`, style: Toast.Style.Failure })
      }
    }
  }

  const responseObject = {
    model: data.model,
    contents: inputMessages,
    config: {
      systemInstruction: data.instructions,
      temperature: data.temperature,
      maxOutputTokens: 60000000,
      // thinkingConfig: true ? { includeThoughts: true } : undefined,
    },
  }

  const response = await deepmind.models.generateContentStream(responseObject)

  let isStreaming: boolean = false;
  for await (const chunk of response) {
    if (chunk.text) {
      streamPipeline({
        apiResponse: chunk.text,
        apiStatus: 'streaming',
      });
      if (!isStreaming) {
        showToast({ title: 'Streaming...', style: Toast.Style.Animated });
        isStreaming = true;
      }
    }
    if (chunk.candidates?.at(0)?.finishReason === 'STOP') {
      let promptTokens: number | undefined = chunk.usageMetadata?.promptTokenCount;
      let responseTokens: number | undefined = chunk.usageMetadata?.candidatesTokenCount;
      streamPipeline({
        apiResponse: '',
        apiStatus: 'done',
        promptTokens: promptTokens,
        responseTokens: responseTokens,
      });
      data.attachments.map(att => att.status === 'staged' ? att.status = 'uploaded' : att.status)
      break
    }
  }
}


// export async function RunOpenAI(data: Data, streamPipeline: StreamPipeline) {
//   const openai = new OpenAI({
//     apiKey: API_KEYS.DEEPMIND,
//     baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
//   });
//
//   const conversation = data.messages
//     .filter(msg => msg.role !== 'model')
//     .map(({ timestamp, id, ...msg }) => ({
//       role: msg.role,
//       content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
//     }));
//
//   let messages: Array<{ role: 'user' | 'assistant' | 'system', content: string }>;
//   if (data.instructions) {
//     messages = [
//       { role: 'system', content: data.instructions },
//       ...conversation
//     ];
//   } else {
//     messages = conversation;
//   }
//
//   const completion = await openai.chat.completions.create({
//     model: data.model,
//     messages: messages,
//     temperature: data.temperature,
//     stream: true
//   })
//
//   let streaming = false;
//   const stream = completion as AsyncIterable<ChatCompletionChunk>;
//   for await (const chunk of stream) {
//     if (typeof chunk.choices[0].delta.content === "string") {
//       if (!streaming) {
//         showToast({ title: 'Streaming', style: Toast.Style.Animated })
//         streaming = true;
//       };
//       streamPipeline(chunk.choices[0].delta.content, "streaming");
//     };
//
//     if (chunk.choices[0].finish_reason == 'stop') {
//       streamPipeline('', 'done');
//       break;
//     };
//   }
// }
