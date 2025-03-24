import { showToast, Toast } from "@raycast/api";
import OpenAI from "openai";
import { ChatCompletionChunk, ChatCompletion } from "openai/resources";
import { API_KEYS } from '../enums';
import fs from 'fs';

import { type Data } from "../chat_form";
import { type StreamPipeline } from "../chat_answer";
import { ChatCompletionMessageParam, ChatCompletionCreateParamsStreaming } from "openai/resources/chat";
// import { Stream } from "openai/streaming";

type CompletionMessages = Array<{
  role: 'user' | 'assistant' | 'system',
  content: string | Array<{
    type: 'text' | 'file' | 'document' | 'image',
    text?: string,
    file?: object,
  }>,
}>;

// type AssistantMessages = Array<{
//   role: 'user' | 'assistant',
//   content: string | Array<{
//     type: 'text' | 'file' | 'document' | 'image',
//     text?: string,
//     file?: object, // { filename: string, file_data: string }
//   }>,
// }>;


export async function RunChat(data: Data, streamPipeline: StreamPipeline) {
  let messages: CompletionMessages = data.messages.map(({ timestamp, ...msg }) => msg)
  await AddAttachments(data, messages)
  const completionInput = await CompletionInput(data, messages) as ChatCompletionCreateParamsStreaming;
  CreateStream(data, completionInput, streamPipeline)
}

//  Helper Functions  //
async function AddAttachments(data: Data, messages: CompletionMessages) {
  if (data.attachments && ['gpt-4o', 'gpt-4o-mini', 'gpt-4.5-preview', 'o1'].includes(data.model)) {
    // file has no persistance, on future use filter?
    const attachmentsQueue = data.attachments  // .filter(({ status }) => status !== 'uploaded')
    if (attachmentsQueue) {
      const prompt: string = messages.slice(-1)[0].content as string;
      let content: CompletionMessages[0]["content"] = [{
        type: 'text',
        text: prompt
      }]
      for (const attachment of attachmentsQueue) {
        const arrayBuffer = fs.readFileSync(attachment.path);  //limit of one file
        const base64String = arrayBuffer.toString('base64');
        content.push({
          type: 'file',
          file: {
            filename: attachment.name,  // limitation of one file
            file_data: `data:application/pdf;base64,${base64String}`
          }
        })
        attachment.status = 'uploaded';
      }
      messages[0].content = content;
      // return content
    }
  }
}

async function CompletionInput(data: Data, messages: CompletionMessages) {
  let reasoning_effort;
  if (data.reasoning != 'none') {
    reasoning_effort = data.reasoning;
  } else {
    reasoning_effort = undefined
  }
  const systemMessage = data.systemMessage;
  if (systemMessage && String(systemMessage)) {
    messages = [
      { role: 'system', content: systemMessage },
      ...messages
    ];
  }
  let completionInput: object;
  if (data.model == 'o3-mini' || data.model == 'o1') {
    completionInput = {
      model: data.model,
      reasoning_effort: reasoning_effort,
      messages: messages as ChatCompletionMessageParam[],
      temperature: data.temperature,
      stream: data.stream,
      store: true,
    }
  } else if (data.model == 'gpt-4o-search-preview') {
    completionInput = {
      model: data.model,
      messages: messages as ChatCompletionMessageParam[],
      stream: data.stream,
    }
  } else {
    completionInput = {
      model: data.model,
      messages: messages as ChatCompletionMessageParam[],
      temperature: data.temperature,
      stream: data.stream,
    };
  }
  return completionInput
}

async function CreateStream(data: Data, completionInput: ChatCompletionCreateParamsStreaming, streamPipeline: Function) {
  let isStreaming = false;
  const openai = new OpenAI({ apiKey: API_KEYS.OPENAI });
  const completion: unknown = await openai.chat.completions.create(completionInput);
  if (data.stream) {
    const stream = completion as AsyncIterable<ChatCompletionChunk>;
    showToast({ title: 'Uploaded', style: Toast.Style.Success })
    for await (const chunk of stream) {
      if (typeof chunk.choices[0].delta.content === "string") {
        if (!isStreaming) {
          showToast({ title: 'Streaming', style: Toast.Style.Animated })
          isStreaming = true;
        };
        streamPipeline(chunk.choices[0].delta.content, "streaming");
      } else if (chunk.choices[0].finish_reason == 'stop') {
        streamPipeline('', 'done');
        break;
      };
    }
  } else {
    const chatCompletion = completion as ChatCompletion;
    streamPipeline(chatCompletion.choices[0].message.content as string, 'done');
  }
}



export async function CreateThread(data?: Data) {
  const openai = new OpenAI({ apiKey: API_KEYS.OPENAI });
  let newThread;

  if (data) {
    const messages = data.messages.map(({ timestamp, ...msg }) => (
      {
        role: msg.role !== 'system' ? msg.role : 'assistant',
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
      }
    ));

    newThread = await openai.beta.threads.create({
      messages: messages,
    });
  } else {
    newThread = await openai.beta.threads.create();
  }

  return newThread;
}


export async function UploadFiles(filePaths: string[]) {
  if (filePaths.length) {
    const fileStreams = filePaths.map((path) =>
      fs.createReadStream(path)
    );
    // console.log(fileStreams);
    const openai = new OpenAI({ apiKey: API_KEYS.OPENAI });
    const fileIDs = [];

    // INSTEAD OF UPLOADING ONE FILE AT A TIME, I CAN JUST CREATE A VECTOR WITH THE FILES AND UPLOAD ONE THING AND NAME IT
    //
    //
    //
    //
    showToast({ title: 'File Upload Started', style: Toast.Style.Animated })
    let numFilesUploaded = 0;
    for (const fileStream of fileStreams) {
      const file = await openai.files.create({
        file: fileStream,
        purpose: "assistants",
      });
      fileIDs.push(file.id);
      numFilesUploaded++;
      showToast({ title: `File Uploaded (${numFilesUploaded}/${fileStreams.length})`, style: Toast.Style.Animated })
    };
    showToast({ title: 'File Upload Done' });
    return fileIDs;
  }
  return null;
}


export async function NewThreadMessage(data: Data) {
  const messages = data.messages
    .map(({ timestamp, ...msg }) => ({
      role: msg.role !== 'system' ? msg.role : 'assistant',
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
    }))

  if (data.threadID) {
    const openai = new OpenAI({ apiKey: API_KEYS.OPENAI });
    const lastMessage = messages[messages.length - 1];
    if (typeof lastMessage.content === 'string') {
      await openai.beta.threads.messages.create(
        data.threadID,
        {
          role: lastMessage.role,
          content: lastMessage.content || '',
          attachments: data.assistantAttachments,
        }
      );

    }
    // console.log(threadMessages);
  }
}


export async function RunThread(data: Data, streamPipeline: (response: string, status: string) => void) {
  if (data.assistantID && data.threadID) {
    const openai = new OpenAI({ apiKey: API_KEYS.OPENAI });
    const stream = await openai.beta.threads.runs.create(
      data.threadID,
      {
        assistant_id: data.assistantID,
        stream: true,
        model: data.model,
        additional_instructions: data.assistantInstructions,
      }
    );

    if (data.attachments?.length) {
      showToast({ title: 'Processing', style: Toast.Style.Animated })
    }

    let streamingStarted = false;
    for await (const chunk of stream) {
      if (chunk.event === 'thread.message.delta') {
        if (chunk.data.delta.content) {
          if (chunk.data.delta.content[0].type === 'text' && chunk.data.delta.content[0].text?.value) {
            streamPipeline(chunk.data.delta.content[0].text.value, "streaming");
            if (!streamingStarted) {
              showToast({ title: 'Streaming', style: Toast.Style.Animated });
              streamingStarted = true;
            }
            // console.log(chunk.data.delta.content[0].text.value)
          }
        }
      };

      if (chunk.event === 'thread.run.failed') {
        showToast({ title: 'Thread Run Failed', style: Toast.Style.Failure });
        break
      }

      if (chunk.event === 'thread.run.completed') {
        streamPipeline('', 'done');
        // console.log(`run_id: ${chunk.data.id}`)
        return chunk.data.id
      };
    }
  }
}


export async function TitleConversation(data: Data) {
  showToast({ title: 'Creating a title', style: Toast.Style.Animated })
  const openai = new OpenAI({ apiKey: API_KEYS.OPENAI });
  const messages = data.messages.map(({ timestamp, ...msg }) => (
    {
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
    }
  ));

  const chat = await openai.chat.completions.create({
    messages: [
      ...messages,
      {
        role: 'user',
        content: 'Give a short and descriptive title to the chat without mentioning so or using special characters. The title must describe the intention of the user.'
      }
    ],
    model: 'gpt-4o-mini'
  });

  showToast({ title: 'Title created' });
  return chat.choices[0]?.message.content
}
