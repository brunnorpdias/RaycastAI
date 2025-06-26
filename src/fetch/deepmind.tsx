import { showToast, Toast } from "@raycast/api";
import { GoogleGenAI } from "@google/genai";
import path from 'path';
import assert from "assert";
import fs from "fs";

import { API_KEYS } from '../config/api_keys';

import { type Data, storageDir } from "../utils/models";
import { type StreamPipeline } from "../views/answer";

type Content = Array<{
  role: 'user' | 'model',
  parts?: Array<{
    text?: string,
    inlineData?: { data: string, mimeType: string },
    fileData?: FileReference,
  }>,
}>

type FileReference = { fileUri: string, mimeType: string };


const deepmind = new GoogleGenAI({ apiKey: API_KEYS.DEEPMIND })

export async function RunGoogle(data: Data, streamPipeline: StreamPipeline) {
  // port summarisation and title creation to gemini 2.0 flash
  let messages = data.messages
    .map(({ id, tokenCount, role, content, ...msg }) => {
      return {
        role: role === 'assistant' ? 'model' : 'user',
        parts: [{ text: content }],
        ...msg,
      }
    }) as (Content[number] & { timestamp: number })[]

  if (data.files.length > 0) {
    for (const file of data.files) {
      const filePath = path.join(storageDir, `${file.hash}.${file.extension}`);
      const arrayBuffer = fs.readFileSync(filePath);
      assert(arrayBuffer !== undefined, 'File not found')

      const mimeType: string | undefined =
        ['pdf'].includes(file.extension) ?  // documents
          `application/${file.extension}` :
          ['txt', 'html', 'md', 'csv'].includes(file.extension) ?  // text
            `text/${file.extension}` :
            // is text correct?
            ['png', 'jpeg', 'webp', 'heic', 'heif'].includes(file.extension) ?  // images
              `image/${file.extension}` :
              undefined
      assert(mimeType !== undefined, `File format ${file.extension} not supported`)
      let message: Content[number] | undefined = messages.find(msg => msg.timestamp === file.timestamp)
      assert(message !== undefined, 'No messages match the timestamp of one of the files')
      assert(Array.isArray(message.parts), 'Message content attribute was not converted to an array')

      const totalFilesSize: number = data.files
        .map(file => file.size)
        .filter(size => typeof size === 'number')
        .reduce((totalSize, size) => totalSize + size, 0)
      // now file upload is not dependent on "private" variable, but on file upload limitations
      if (totalFilesSize <= 20 * 10 ** 6) {
        const inlineData = {
          inlineData: {
            mimeType: mimeType,
            data: arrayBuffer.toString('base64')
          }
        }
        message.parts.push(inlineData)
        file.status = 'staged';
      } else {
        if (file.status !== 'uploaded') {
          const fileBlob = new Blob([arrayBuffer], { type: mimeType });
          const uploadedFile = await deepmind.files.upload({
            file: fileBlob,
            config: { displayName: file.name },
          })
          assert(uploadedFile.uri && uploadedFile.mimeType, 'Error uploading file')
          showToast({ title: `File ${file.name} uploaded`, style: Toast.Style.Success })
          file.id = uploadedFile.uri;
        }
        const fileData = {
          fileData: {
            fileUri: file.id,
            mimeType: mimeType,
          } as FileReference
        };
        message.parts.push(fileData)
        file.status = file.status === 'uploaded' ? 'uploaded' : 'staged';
      }
    }
  }
  const content: Content = messages.map(({ timestamp, ...msg }) => msg)

  const responseObject = {
    model: data.model as any,
    contents: content,
    config: {
      systemInstruction: data.instructions,
      maxOutputTokens: 60000000,
      thinkingConfig: {
        includeThoughts: data.reasoning === 'none' || !data.reasoning ? false : true,
        thinkingBudget: data.reasoning === 'none' ?
          0 : data.reasoning === 'low' ?
            8192 : data.reasoning === 'medium' ?
              16384 : data.reasoning === 'high' ?
                24576 : undefined
      },
      tools: data.tools === 'web' ? [{ googleSearch: {} }] : undefined,
    },
    temperature: data.temperature
  }

  const response = await deepmind.models.generateContentStream(responseObject)// as GenerateContentParameters)

  let isStreaming: boolean = false;
  let isThinking: boolean = false;
  for await (const chunk of response) {
    if (chunk.candidates?.at(0)?.content?.parts?.at(0)?.thought) {
      if (!isThinking) {
        isThinking = true;
        showToast({ title: 'Thinking', style: Toast.Style.Animated });
        streamPipeline({ apiResponse: '# Thinking Summary\n', apiStatus: 'thinking' })
      }
      streamPipeline({
        apiResponse: chunk.candidates?.at(0)?.content?.parts?.at(0)?.text,
        apiStatus: 'thinking'
      })
    } else if (chunk.text) {
      if (isThinking) {
        isThinking = false;
        // streamPipeline({ apiResponse: '\n---\n---\n# Answer\n', apiStatus: 'streaming' })
        streamPipeline({ apiStatus: 'reset' });
      }
      streamPipeline({
        apiResponse: chunk.text,
        apiStatus: 'streaming',
      });
      if (!isStreaming) {
        showToast({ title: 'Streaming', style: Toast.Style.Animated });
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
      data.files.map(att => att.status === 'staged' ? att.status = 'uploaded' : att.status)
      break
    }
  }
}
