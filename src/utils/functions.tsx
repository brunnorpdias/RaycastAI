import { LocalStorage, Cache as RaycastCache, showToast, Toast } from "@raycast/api";
import fs from 'fs';
import assert from "assert";
import * as crypto from 'crypto';
import path from 'path';

import * as OpenAPI from "../fetch/openAI";
import NewEntry from '../views/new_entry';

import { type ChatSession, FileStatus, storageDir } from "./models";
type Bookmarks = Array<{ title: string, data: ChatSession }>;


export async function BookmarkChat(data: ChatSession, isManuallyBookmarked: boolean) {
  const bookmarksString = await LocalStorage.getItem('bookmarkedChats');
  // create provision to create bookmarks for new users
  assert(bookmarksString && typeof bookmarksString === 'string', 'Bookmarks not found')
  const bookmarks: Bookmarks = JSON.parse(bookmarksString);
  assert(bookmarks !== undefined, 'Bookmarks is corrupted')
  const bookmarkIndex: number = bookmarks.findIndex(bookmark => bookmark.data.timestamp === data.timestamp);
  if (bookmarkIndex === -1 && !isManuallyBookmarked) return

  const title = await OpenAPI.TitleConversation(data);
  assert(typeof title === 'string', 'Title wasn\'t able to be created')
  const newBookmark: Bookmarks[number] = { title: title, data: data }

  if (bookmarkIndex >= 0) {  // bookmark already exists
    bookmarks[bookmarkIndex] = newBookmark;
  } else {  // if bookmark doesn't exist and user manually bookmarked
    bookmarks.push(newBookmark);
    showToast({ title: 'Bookmarked', style: Toast.Style.Success })
  }
  const newBookmarksString: string = JSON.stringify(bookmarks)
  LocalStorage.setItem('bookmarkedChats', newBookmarksString);
}


export async function CacheChat(newChat: ChatSession) {
  const cache = new RaycastCache();
  const cacheString = cache.get('cachedChat');
  const cachedChat: ChatSession[] = cacheString ? JSON.parse(cacheString) : [];
  if (cachedChat.length > 0) {
    const filteredCache: ChatSession[] = cachedChat
      .filter(cache => cache.timestamp !== newChat.timestamp) // remove data if it's already cached
    const newList = [...filteredCache, newChat];
    const newCachedChat: ChatSession[] = newList
      .sort((a, b) => (b.messages.at(-1)?.timestamp || 0) - (a.messages.at(-1)?.timestamp || 0))
      .slice(0, 96)
    cache.set('cachedChat', JSON.stringify(newCachedChat));
  } else {
    const list = [newChat];
    cache.set('cachedChat', JSON.stringify(list));
  }
}


export async function CacheDeepResearch(newChat: ChatSession) {
  // cache or LocalStorage?
  const cache = new RaycastCache();
  const cacheString = cache.get('cacheDR');
  const cachedChat: ChatSession[] = cacheString ? JSON.parse(cacheString) : [];
  if (cachedChat.length > 0) {
    const filteredCache: ChatSession[] = cachedChat
      .filter(cache => cache.timestamp !== newChat.timestamp) // remove data if it's already cached
    const newList = [...filteredCache, newChat];
    const newCachedChat: ChatSession[] = newList
      .sort((a, b) => (b.messages.at(-1)?.timestamp || 0) - (a.messages.at(-1)?.timestamp || 0))
      .slice(0, 32)
    cache.set('cacheDR', JSON.stringify(newCachedChat));
  } else {
    const list = [newChat];
    cache.set('cacheDR', JSON.stringify(list));
  }
}


export async function ProcessFiles(attatchmentPaths: [string], messageTimestamp: number) {
  const fileInfos = []

  for (const attPath of attatchmentPaths) {
    const ext = path.extname(attPath).replaceAll('.', '')
    const name = path.basename(attPath, `.${ext}`)
    const arrayBuffer = fs.readFileSync(attPath);
    const sizeInBytes: number = arrayBuffer.length;
    const fileHash = crypto.createHash('sha256').update(arrayBuffer).digest('hex');
    const fileInfo: ChatSession["files"][number] = {
      hash: fileHash,
      name: name,
      extension: ext,
      status: FileStatus.Idle,
      timestamp: messageTimestamp,
      size: sizeInBytes,
    }
    fileInfos.push(fileInfo)

    const writePath = path.join(storageDir, `${fileHash}.${ext}`);
    if (!fs.existsSync(writePath)) {
      fs.writeFileSync(writePath, arrayBuffer);
    }
  }

  return fileInfos
}


export async function FilesCleanup() {
  const cache = new RaycastCache();
  const cacheString = cache.get('cachedChat');
  const cachedChat: ChatSession[] = cacheString ? JSON.parse(cacheString) : [];
  const bookmarksString = await LocalStorage.getItem('bookmarkedChats');
  assert(typeof bookmarksString === 'string', 'Bookmarks not found')
  const bookmarks: Bookmarks = JSON.parse(bookmarksString);
  const cachedFileNames: string[] = cachedChat.flatMap(data => data.files.map(file => `${file.hash}.${file.extension}`));
  const bookmarkFileNames: string[] = bookmarks.flatMap(bookmark => bookmark.data.files.map(file => `${file.hash}.${file.extension}`));
  const savedFiles: string[] = cachedFileNames.concat(bookmarkFileNames);
  const existingFiles = fs.readdirSync(storageDir);
  for (const file of existingFiles) {
    if (!savedFiles.includes(file)) {
      fs.unlinkSync(`${storageDir}/${file}`);
    }
  }
}


export function CreateNewEntry(data: ChatSession, push: Function, msgTimestamp?: number) {
  const lastTimestamp = data.messages.at(-1)?.timestamp
  if (msgTimestamp && lastTimestamp && msgTimestamp !== lastTimestamp) {
    const messageIndex: number = data.messages
      .findLastIndex(msg => msg.timestamp === msgTimestamp)
    assert(messageIndex, 'Message timestamp didn\`t match');
    const truncChat: ChatSession = { ...data, messages: data.messages.slice(0, messageIndex + 1) };
    // Confirm overwrite of conversation
    showToast({
      title: 'Overwrite conversation?', style: Toast.Style.Failure, primaryAction: {
        title: "Yes",
        onAction: () => {
          // delete all previous responses on the api in case it's a non-private message (saved on server)
          // https://platform.openai.com/docs/api-reference/responses/delete
          push(<NewEntry chat={truncChat} />)
        }
      }
    })
  } else {
    push(<NewEntry chat={data} />)
  }
}
