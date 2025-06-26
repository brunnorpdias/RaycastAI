import { LocalStorage, Cache as RaycastCache, showToast, Toast } from "@raycast/api";
import fs from 'fs';
import assert from "assert";
import * as crypto from 'crypto';
import path from 'path';

import * as OpenAPI from "../fetch/openAI";
import NewEntry from '../views/new_entry';

import { type Data, storageDir } from "./models";
type Bookmarks = Array<{ title: string, data: Data }>;


export async function Bookmark(data: Data, isManuallyBookmarked: boolean) {
  const bookmarksString = await LocalStorage.getItem('bookmarks');
  // create provision to create bookmarks for new users
  assert(typeof bookmarksString === 'string', 'Bookmarks not found')
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
  LocalStorage.setItem('bookmarks', newBookmarksString);
}


export async function Cache(newData: Data) {
  const cache = new RaycastCache();
  const cacheString = cache.get('cachedData');
  const cachedData: Data[] = cacheString ? JSON.parse(cacheString) : [];
  if (cachedData.length > 0) {
    const filteredCache: Data[] = cachedData
      .filter(cache => cache.timestamp !== newData.timestamp) // remove data if it's already cached
    const newList = [...filteredCache, newData];
    const newCachedData: Data[] = newList
      .sort((a, b) => (b.messages.at(-1)?.timestamp || 0) - (a.messages.at(-1)?.timestamp || 0))
      .slice(0, 128)
    cache.set('cachedData', JSON.stringify(newCachedData));
  } else {
    const list = [newData];
    cache.set('cachedData', JSON.stringify(list));
  }
}


export async function ProcessFiles(data: Data, attatchmentPaths: [string], messageTimestamp: number) {
  for (const attPath of attatchmentPaths) {
    const ext = path.extname(attPath).replaceAll('.', '')
    const name = path.basename(attPath, `.${ext}`)
    const arrayBuffer = fs.readFileSync(attPath);
    const sizeInBytes: number = arrayBuffer.length;
    const fileHash = crypto.createHash('sha256').update(arrayBuffer).digest('hex');
    data.files.push({
      hash: fileHash,
      name: name,
      extension: ext,
      status: 'idle',
      timestamp: messageTimestamp,
      size: sizeInBytes,
    });

    // limitation of the file path, could be more universal but i wanted to keep on the project dir
    fs.mkdirSync(storageDir, { recursive: true });
    const writePath = path.join(storageDir, `${fileHash}.${ext}`);
    if (!fs.existsSync(writePath)) {
      fs.writeFileSync(writePath, arrayBuffer);
    }
  }
}


export async function FilesCleanup() {
  const cache = new RaycastCache();
  const cacheString = cache.get('cachedData');
  const cachedData: Data[] = cacheString ? JSON.parse(cacheString) : [];
  const bookmarksString = await LocalStorage.getItem('bookmarks');
  assert(typeof bookmarksString === 'string', 'Bookmarks not found')
  const bookmarks: Bookmarks = JSON.parse(bookmarksString);
  const cachedFileNames: string[] = cachedData.flatMap(data => data.files.map(file => `${file.hash}.${file.extension}`));
  const bookmarkFileNames: string[] = bookmarks.flatMap(bookmark => bookmark.data.files.map(file => `${file.hash}.${file.extension}`));
  const savedFiles: string[] = cachedFileNames.concat(bookmarkFileNames);
  const existingFiles = fs.readdirSync(storageDir);
  for (const file of existingFiles) {
    if (!savedFiles.includes(file)) {
      fs.unlinkSync(`${storageDir}/${file}`);
    }
  }
}


export function CreateNewEntry(data: Data, newData: Data, push: Function, msgTimestamp?: number) {
  const lastTimestamp = data.messages.at(-1)?.timestamp
  if (msgTimestamp && lastTimestamp && msgTimestamp !== lastTimestamp) {
    const messageIndex: number = data.messages
      .findLastIndex(msg => msg.timestamp === msgTimestamp)
    assert(messageIndex, 'Message timestamp didn\`t match');
    const truncData: Data = { ...data, messages: data.messages.slice(0, messageIndex + 1) };
    // Confirm overwrite of conversation
    showToast({
      title: 'Overwrite conversation?', style: Toast.Style.Failure, primaryAction: {
        title: "Yes",
        onAction: () => {
          // delete all previous responses on the api in case it's a non-private message (saved on server)
          // https://platform.openai.com/docs/api-reference/responses/delete
          push(<NewEntry data={truncData} />)
        }
      }
    })
  } else {
    push(<NewEntry data={newData} />)
  }
}
