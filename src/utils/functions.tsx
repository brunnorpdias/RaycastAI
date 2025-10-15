import { LocalStorage, Cache as RaycastCache, showToast, Toast } from "@raycast/api";
import fs from "fs";
import assert from "assert";
import * as crypto from "crypto";
import path from "path";

import * as OpenAPI from "../fetch/openAI";
import NewEntry from "../views/new_entry";

import { type ChatSession, FileStatus, storageDir } from "./models";
import { buildStoredFilename } from "./storage";
type Bookmarks = Array<{ title: string; chat: ChatSession }>;

export async function BookmarkChat(chat: ChatSession, isManuallyBookmarked: boolean) {
  const bookmarksString = await LocalStorage.getItem("bookmarkedChats");
  // assert(bookmarksString && typeof bookmarksString === 'string', 'Bookmarks not found')
  const bookmarks: Bookmarks = typeof bookmarksString === "string" ? JSON.parse(bookmarksString) : [];
  const bookmarkIndex: number = bookmarks.findIndex((bookmark) => bookmark.chat.timestamp === chat.timestamp);
  if (bookmarkIndex === -1 && !isManuallyBookmarked) return;

  const title = await OpenAPI.TitleConversation(chat);
  assert(typeof title === "string", "Title wasn't able to be created");
  const newBookmark: Bookmarks[number] = { title: title, chat: chat };

  if (bookmarkIndex >= 0) {
    // bookmark already exists
    bookmarks[bookmarkIndex] = newBookmark;
  } else {
    // if bookmark doesn't exist and user manually bookmarked
    bookmarks.push(newBookmark);
    showToast({ title: "Bookmarked", style: Toast.Style.Success });
  }
  const newBookmarksString: string = JSON.stringify(bookmarks);
  await LocalStorage.setItem("bookmarkedChats", newBookmarksString);
}

export async function CacheChat(chat: ChatSession) {
  const cache = new RaycastCache();
  const cacheString = cache.get("cachedChats");
  const cachedChats: ChatSession[] = cacheString ? JSON.parse(cacheString) : [];
  if (cachedChats.length > 0) {
    const filteredCache: ChatSession[] = cachedChats.filter((cache) => cache.timestamp !== chat.timestamp); // remove chat if it's already cached
    const newList = [...filteredCache, chat];
    const newCachedChat: ChatSession[] = newList
      .sort((a, b) => (b.messages.at(-1)?.timestamp || 0) - (a.messages.at(-1)?.timestamp || 0))
      .slice(0, 96);
    cache.set("cachedChats", JSON.stringify(newCachedChat));
  } else {
    const list = [chat];
    cache.set("cachedChats", JSON.stringify(list));
  }
}

export async function ProcessFiles(attachmentPaths: string[], messageTimestamp: number) {
  const fileInfos = [];

  for (const attPath of attachmentPaths) {
    const ext = path.extname(attPath).replaceAll(".", "").toLowerCase();
    const name = path.basename(attPath, path.extname(attPath));
    const arrayBuffer = fs.readFileSync(attPath);
    const sizeInBytes: number = arrayBuffer.length;
    const fileHash = crypto.createHash("sha256").update(arrayBuffer).digest("hex");
    const fileInfo: ChatSession["files"][number] = {
      hash: fileHash,
      name: name,
      extension: ext,
      status: FileStatus.Idle,
      timestamp: messageTimestamp,
      size: sizeInBytes,
    };
    fileInfos.push(fileInfo);

    const preferredName = buildStoredFilename(fileInfo);
    const writePath = path.join(storageDir, preferredName);

    const existingMatch = fs.readdirSync(storageDir).find((storedFile) => storedFile.startsWith(`${fileHash}-`));

    if (existingMatch) {
      const existingPath = path.join(storageDir, existingMatch);
      if (existingPath !== writePath) {
        try {
          fs.renameSync(existingPath, writePath);
        } catch (error) {
          console.error(`Failed to rename stored file ${existingMatch}:`, error);
        }
      }
    } else {
      fs.writeFileSync(writePath, arrayBuffer);
    }
  }

  return fileInfos;
}

export async function FilesCleanup() {
  const cache = new RaycastCache();
  const cacheString = cache.get("cachedChats");
  const cachedChats: ChatSession[] = cacheString ? JSON.parse(cacheString) : [];
  const bookmarksString = await LocalStorage.getItem("bookmarkedChats");
  const bookmarks: Bookmarks =
    typeof bookmarksString === "string" && bookmarksString.length > 0 ? JSON.parse(bookmarksString) : [];
  const savedHashes = new Set<string>();

  const collectHashes = (file: ChatSession["files"][number]) => {
    savedHashes.add(file.hash);
  };

  cachedChats.forEach((chat) => chat.files.forEach(collectHashes));
  bookmarks.forEach((bookmark) => bookmark.chat.files.forEach(collectHashes));

  const existingFiles = fs.readdirSync(storageDir);
  for (const file of existingFiles) {
    const [hashPrefix] = file.split("-", 1);
    if (!hashPrefix || !savedHashes.has(hashPrefix)) {
      const filePath = path.join(storageDir, file);
      try {
        fs.unlinkSync(filePath);
      } catch (error) {
        console.error(`Failed to remove unused file ${filePath}:`, error);
      }
    }
  }
}

export function CreateNewEntry(chat: ChatSession, push: Function, msgTimestamp?: number) {
  const lastTimestamp = chat.messages.at(-1)?.timestamp;
  if (msgTimestamp && lastTimestamp && msgTimestamp !== lastTimestamp) {
    const messageIndex: number = chat.messages.findLastIndex((msg) => msg.timestamp === msgTimestamp);
    assert(messageIndex, "Message timestamp didn\`t match");
    const truncChat: ChatSession = { ...chat, messages: chat.messages.slice(0, messageIndex + 1) };
    // Confirm overwrite of conversation
    showToast({
      title: "Overwrite conversation?",
      style: Toast.Style.Failure,
      primaryAction: {
        title: "Yes",
        onAction: () => {
          // delete all previous responses on the api in case it's a non-private message (saved on server)
          // https://platform.openai.com/docs/api-reference/responses/delete
          push(<NewEntry chat={truncChat} />);
        },
      },
    });
  } else {
    push(<NewEntry chat={chat} />);
  }
}
