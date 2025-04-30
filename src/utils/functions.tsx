// add here
// - summarisation of conversations and title creation (both using openrouter - easy to change models)
// - add long and short summary (for title and short description to be shown on the metadata)
// - bookmarking, caching, and other related functions

import { LocalStorage, Cache as RaycastCache, showToast, Toast } from "@raycast/api";
import { type Data, type FileData } from "./types";
import * as OpenAPI from "../fetch/openAI";
import fs from 'fs';
import assert from "assert";
import * as crypto from 'crypto';

import NewEntry from '../views/new_entry';

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
  const cache = new RaycastCache();//{ capacity: 100 * 1024 * 1024 });
  const dataString = cache.get('cachedData');
  const cachedData: Data[] = dataString ? JSON.parse(dataString) : [];
  if (cachedData.length > 0) {
    const filteredCache: Data[] = cachedData
      .filter(cache => cache.timestamp !== newData.timestamp) // remove data if it's already cached
    const newList = [...filteredCache, newData];
    const newCachedData: Data[] = newList
      .sort((a, b) => (b.messages.at(-1)?.timestamp || 0) - (a.messages.at(-1)?.timestamp || 0))
      .slice(0, 30)
    cache.set('cachedData', JSON.stringify(newCachedData));
  } else {
    const list = [newData];
    cache.set('cachedData', JSON.stringify(list));
  }
}


export async function ProcessFiles(data: Data, attatchmentPaths: [string], messageTimestamp: number) {
  // await LocalStorage.removeItem('files')
  let filesString: string | undefined = await LocalStorage.getItem('files');
  if (filesString === undefined) filesString = JSON.stringify([])
  let filesData: FileData[] = JSON.parse(filesString).slice(0, 30)
  let filesObject: FileData[] = [...filesData];
  for (const path of attatchmentPaths) {
    let arrayBuffer = fs.readFileSync(path);
    const base64String = arrayBuffer.toString('base64');
    let sizeInBytes: number | undefined = base64String.length * 3 / 4;
    const hash = crypto.createHash('sha256');
    hash.update(arrayBuffer);
    const fileHash = hash.digest('hex');
    data.files.push({
      status: 'idle',
      timestamp: messageTimestamp,
      hash: fileHash,
      path: path,
      size: sizeInBytes,
    })

    filesObject.push({
      hash: fileHash,
      rawData: Array.from(arrayBuffer),
    })
  }

  console.log(filesObject)
  await LocalStorage.setItem('files', JSON.stringify(filesObject));
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
        onAction: () => { push(<NewEntry data={truncData} />) }
      }
    })
  } else {
    push(<NewEntry data={newData} />)
  }
}
