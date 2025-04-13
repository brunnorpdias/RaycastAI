// add here
// - summarisation of conversations and title creation (both using openrouter - easy to change models)
// - add long and short summary (for title and short description to be shown on the metadata)
// - bookmarking, caching, and other related functions

import { LocalStorage, Cache as RaycastCache, showToast, Toast } from "@raycast/api";
import { type Data } from "./types";
import * as OpenAPI from "../fetch/openAI";

type Bookmarks = Array<{ title: string, data: Data }>;


export async function Bookmark(data: Data, isManuallyBookmarked: boolean) {
  const stringBookmarks = await LocalStorage.getItem('bookmarks');
  if (typeof stringBookmarks !== 'string') return false;
  const bookmarks: Bookmarks = JSON.parse(stringBookmarks);
  const bookmarkIndex: number = bookmarks.findIndex(bookmark => bookmark.data.timestamp === data.timestamp);

  if (bookmarkIndex >= 0) {  // bookmark already exists
    const title = await OpenAPI.TitleConversation(data);
    if (typeof title !== 'string') return false;
    bookmarks[bookmarkIndex] = { title: title, data: data };
    LocalStorage.setItem('bookmarks', JSON.stringify(bookmarks));
    // showToast({ title: 'Bookmark modified', style: Toast.Style.Success })
  } else if (isManuallyBookmarked) {
    const title = await OpenAPI.TitleConversation(data);
    if (typeof title !== 'string') return false;
    bookmarks.push({ title: title, data: data });
    LocalStorage.setItem('bookmarks', JSON.stringify(bookmarks));
    showToast({ title: 'Bookmarked', style: Toast.Style.Success })
  }
}


export async function Cache(data: Data) {
  const raycastCache = new RaycastCache();
  const cachedDataString = raycastCache.get('cachedData');
  let cachedData: Data[] = cachedDataString ? JSON.parse(cachedDataString) : undefined;
  if (cachedData?.length > 0) {
    const filteredCache: Data[] = cachedData
      .filter(cache => cache.timestamp !== data.timestamp) // remove data if it's already cached
    const newList = [...filteredCache, data];
    const newCachedData: Data[] = newList
      .sort((a, b) => (b.messages.at(-1)?.timestamp || 0) - (a.messages.at(-1)?.timestamp || 0))
      .slice(0, 30)
    raycastCache.set('cachedData', JSON.stringify(newCachedData));
  } else {
    const list = [data];
    raycastCache.set('cachedData', JSON.stringify(list));
  }
  // showToast({ title: 'Cached', style: Toast.Style.Success });
}
