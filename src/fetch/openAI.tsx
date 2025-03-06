import { showToast, Toast } from "@raycast/api";
import OpenAI from "openai";
import { ChatCompletionChunk, ChatCompletion } from "openai/resources";
import { API_KEYS } from '../enums';
import fs from 'fs';

type Data = {
  id: number;
  temperature: number;
  conversation: Array<{ role: 'user' | 'assistant', content: string, timestamp: number }>;
  model: string;
  api?: string;
  systemMessage?: string;
  instructions?: string;
  stream?: boolean;
  assistantID?: string;
  threadID?: string;
  runID?: string;
  attachments?: Array<{ file_id: string, tools: Array<{ type: 'code_interpreter' | 'file_search' }> }>;
  reasoning: 'low' | 'medium' | 'high';
};

type Messages = Array<{ role: 'user' | 'assistant', content: string }>;


export async function RunChat(data: Data, onResponse: (response: string, status: string) => void) {
  const openai = new OpenAI({ apiKey: API_KEYS.OPENAI });
  const conversation = data.conversation.map(({ timestamp, ...rest }) => rest);
  let messages: Array<{ role: 'user' | 'assistant' | 'system', content: string }>;

  const systemMessage = data.systemMessage;
  if (systemMessage && typeof (systemMessage) == 'string') {
    messages = [
      { role: 'system', content: systemMessage },
      ...conversation
    ];
  } else {
    messages = [...conversation];
  }

  let completion;
  if (data.model == 'o3-mini') {
    completion = await openai.chat.completions.create({
      model: data.model,
      reasoning_effort: data.reasoning,
      messages: messages,
      temperature: data.temperature,
      stream: data.stream,
      store: true,
    });
  } else {
    completion = await openai.chat.completions.create({
      model: data.model,
      messages: messages,
      temperature: data.temperature,
      stream: data.stream,
    });
  }

  let streaming = false;
  if (data.stream) {
    const stream = completion as AsyncIterable<ChatCompletionChunk>;
    for await (const chunk of stream) {
      // console.log(JSON.stringify(chunk));
      if (typeof chunk.choices[0].delta.content === "string") {
        if (!streaming) {
          showToast({ title: 'Streaming', style: Toast.Style.Animated })
          streaming = true;
        };
        onResponse(chunk.choices[0].delta.content, "streaming");
      };

      if (chunk.choices[0].finish_reason == 'stop') {
        onResponse('', 'done');
        break;
      };
    }
  } else {
    const chatCompletion = completion as ChatCompletion;
    onResponse(chatCompletion.choices[0].message.content as string, 'done');
  }
}


export async function CreateThread(data?: Data) {
  const openai = new OpenAI({ apiKey: API_KEYS.OPENAI });
  let newThread;
  if (data) {
    newThread = await openai.beta.threads.create({
      messages: data.conversation,
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
  if (data.threadID) {
    const openai = new OpenAI({ apiKey: API_KEYS.OPENAI });

    const lastMessage = data.conversation[data.conversation.length - 1];
    await openai.beta.threads.messages.create(
      data.threadID,
      {
        role: lastMessage.role,
        content: lastMessage.content,
        attachments: data.attachments
      }
    );
    // console.log(threadMessages);
  }
}


export async function RunThread(data: Data, onResponse: (response: string, status: string) => void) {
  if (data.assistantID && data.threadID) {
    const openai = new OpenAI({ apiKey: API_KEYS.OPENAI });
    const stream = await openai.beta.threads.runs.create(
      data.threadID,
      {
        assistant_id: data.assistantID,
        stream: true,
        model: data.model,
        additional_instructions: data.instructions,
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
            onResponse(chunk.data.delta.content[0].text.value, "streaming");
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
        onResponse('', 'done');
        // console.log(`run_id: ${chunk.data.id}`)
        return chunk.data.id
      };
    }
  }
}


export async function TitleConversation(messages: Messages) {
  showToast({ title: 'Creating a title', style: Toast.Style.Animated })
  const openai = new OpenAI({ apiKey: API_KEYS.OPENAI });
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
