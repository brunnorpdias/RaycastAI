import { showToast, Toast } from "@raycast/api";
import { GoogleGenAI } from "@google/genai";

import { API_KEYS } from '../enums/api_keys';

import { type Data } from "../utils/types";
import { type StreamPipeline } from "../views/answer";
import assert from "assert";

type Content = Array<{
  role: 'user' | 'model',
  parts?: Array<{
    text?: string,
    inlineData?: { data: string, mimeType: string },
    fileData?: FileData,
  }>,
}>

type FileData = { fileUri: string, mimeType: string };


const deepmind = new GoogleGenAI({ apiKey: API_KEYS.DEEPMIND })

export async function RunGoogle(data: Data, streamPipeline: StreamPipeline) {
  // port summarisation and title creation to gemini 2.0 flash
  // add code execution, pdf, files, and thinking
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
      const fileName = file.path.slice(file.path.lastIndexOf('/') + 1, file.path.lastIndexOf('.'))
      const fileExtension = file.path.slice(file.path.lastIndexOf('.') + 1)
      const base64: string | undefined = file.rawData?.toString('base64');
      const mimeType: string | undefined =
        ['pdf'].includes(fileExtension) ?  // documents
          `application/${fileExtension}` :
          ['txt', 'html', 'md', 'csv'].includes(fileExtension) ?  // text
            `text/${fileExtension}` :
            // is text correct?
            ['png', 'jpeg', 'webp', 'heic', 'heif'].includes(fileExtension) ?  // images
              `image/${fileExtension}` :
              undefined
      assert(mimeType !== undefined, `File format ${fileExtension} not supported`)
      let message: Content[number] | undefined = messages.find(msg => msg.timestamp === file.timestamp)
      assert(message !== undefined, 'No messages match the timestamp of one of the files')
      assert(message.parts !== undefined, 'Message doesn\'t contain contents attribute')
      assert(Array.isArray(message.parts), 'Message content attribute was not converted to an array')
      if (data.private) {
        // check if files are larger than 20mb and file type
        const totalFilesSize: number = data.files
          .map(file => file.size)
          .filter(size => typeof size === 'number')
          .reduce((totalSize, size) => totalSize + size, 0)
        assert(totalFilesSize <= 20 * 10 ** 6, `Total file size ${totalFilesSize / 10 ** 6}mb is over private size limit`)
        assert(base64, 'File data not found')
        const inlineData = {
          inlineData: {
            mimeType: mimeType,
            data: base64
          }
        }
        message?.parts.push(inlineData)
        file.status = 'staged';
      } else {
        if (file.status !== 'uploaded') {
          const arrayBuffer = file.rawData
          assert(arrayBuffer !== undefined, 'File data was not found')
          const fileBlob = new Blob([arrayBuffer], { type: mimeType });
          const uploadedFile = await deepmind.files.upload({
            file: fileBlob,
            config: { displayName: fileName },
          })
          assert(uploadedFile.uri && uploadedFile.mimeType, 'Error uploading file')
          showToast({ title: `File ${fileName} uploaded`, style: Toast.Style.Success })
          file.fileUri = uploadedFile.uri;
        }
        const fileData = {
          fileData: {
            fileUri: file.fileUri,
            mimeType: mimeType,
          } as FileData
        }
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
      // thinkingConfig: true ? { includeThoughts: true } : undefined,
    },
  }

  const response = await deepmind.models.generateContentStream(responseObject)// as GenerateContentParameters)

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
      data.files.map(att => att.status === 'staged' ? att.status = 'uploaded' : att.status)
      break
    }
  }
}
