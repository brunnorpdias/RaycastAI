import {
  Action,
  ActionPanel,
  Icon,
  List as RaycastList,
  Cache as RaycastCache,
  LocalStorage,
  useNavigation,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { format as DateFormat } from "date-fns";
import ChatHistory from "./history";
import assert from "assert";

import { type ChatSession } from "../utils/models";
import * as Functions from "../utils/functions";

type Bookmark = { title: string; chat: ChatSession };
type RawItem = ChatSession & { summary?: string };
type ListItem = {
  chat: ChatSession;
  state: ChatSession["workflowStage"];
  key: number;
  msg_count: number;
  title: string;
  markdown: string;
  provider: { name: string; iconDir: string };
  model: string;
  created: string;
  modified: string;
  summary?: string;
  attachmentNames?: string[];
  tokenCount?: number;
};

const apiToIcon = {
  openai: { name: "OpenAI", icon: "../assets/openai-logo.svg" },
  deepmind: { name: "Deep Mind", icon: "../assets/deepmind-icon.png" },
  anthropic: { name: "Anthropic", icon: "../assets/anthropic-icon.png" },
  openrouter: { name: "OpenRouter", icon: "../assets/open_router-logo.png" },
  ollama: { name: "Ollama", icon: "../assets/ollama-icon.png" },
};

export default function SavedChats({ cacheOrBookmarks }: { cacheOrBookmarks: "cache" | "bookmarks" }) {
  const { push } = useNavigation();
  const [list, setList] = useState<ListItem[]>();
  // setup custom filtering (whole text?)
  // https://developers.raycast.com/api-reference/user-interface/list#custom-filtering

  useEffect(() => {
    LoadChat();
  }, [cacheOrBookmarks]);

  async function LoadChat() {
    await Functions.FilesCleanup();
    let rawList: RawItem[];
    if (cacheOrBookmarks === "cache") {
      const cache = new RaycastCache(); //{ capacity: 100 * 1024 * 1024 });
      const stringCache = cache.get("cachedChats");
      rawList = stringCache ? JSON.parse(stringCache) : [];
    } else {
      const stringBookmarks = (await LocalStorage.getItem("bookmarkedChats")) as string;
      const bookmarksChat: Bookmark[] = stringBookmarks ? JSON.parse(stringBookmarks) : [];
      rawList = bookmarksChat.map((bookmark: Bookmark) => ({
        ...bookmark.chat,
        summary: bookmark.title,
      }));
    }

    const optimisedList: ListItem[] = rawList
      .filter((item) => item.messages.length > 0)
      .sort((a, b) => {
        const aTimestamps: number[] = a.messages.map((msg) => msg.timestamp).filter((ts) => typeof ts === "number");
        const bTimestamps: number[] = b.messages.map((msg) => msg.timestamp).filter((ts) => typeof ts === "number");
        const aLastTimestamp = Math.max(...aTimestamps);
        const bLastTimestamp = Math.max(...bTimestamps);
        return bLastTimestamp - aLastTimestamp;
      })
      .map((item) => {
        return {
          chat: item,
          state: item.workflowStage,
          key: item.timestamp,
          title:
            cacheOrBookmarks === "cache" ? (item.messages.at(0)?.content ?? "") : (item.summary ?? "No summary..."),
          msg_count: item.messages.length,
          markdown: item.messages
            .slice(0, 4)
            .map((msg) => msg.content)
            .join(`\n\r---\n\r---\n\r`),
          provider: { name: apiToIcon[item.api].name, iconDir: apiToIcon[item.api].icon },
          model: item.model,
          created: DateFormat(item.timestamp, "HH:mm:ss dd/MM/yy"),
          modified: DateFormat(item.messages.at(-1)?.timestamp ?? 0, "HH:mm:ss dd/MM/yy"),
          summary: item.summary,
          attachmentNames: item.files?.map((file) => file.name), // ?? [],
          tokenCount: item.messages
            .map((msg) => msg.tokenCount)
            .filter((value) => typeof value === "number")
            .reduce((sum, value) => sum + value, 0),
        };
      });
    setList(optimisedList);
  }

  const memo = useMemo(() => {
    if (list) {
      return list.map((listItem: ListItem) => (
        <RaycastList.Item
          key={listItem.key}
          title={listItem.title}
          detail={
            <RaycastList.Item.Detail
              markdown={listItem.markdown}
              metadata={
                <RaycastList.Item.Detail.Metadata>
                  <RaycastList.Item.Detail.Metadata.Label
                    title="Provider"
                    text={listItem.provider.name}
                    icon={listItem.provider.iconDir}
                  />
                  <RaycastList.Item.Detail.Metadata.Label title="Model" text={listItem.model} />
                  {cacheOrBookmarks === "bookmarks" && listItem.summary && (
                    <RaycastList.Item.Detail.Metadata.Label title="Summary" text={listItem.summary} />
                  )}
                  {listItem.attachmentNames && listItem.attachmentNames.length > 0 && (
                    <RaycastList.Item.Detail.Metadata.Label
                      title="Attachments"
                      text={listItem.attachmentNames.join(", ")}
                    />
                  )}
                  {(listItem.tokenCount ?? 0) > 0 && (
                    <RaycastList.Item.Detail.Metadata.Label
                      title="Token / Message Count"
                      text={`${listItem.tokenCount?.toLocaleString()} tokens / ${listItem.msg_count} messages`}
                    />
                  )}
                  <RaycastList.Item.Detail.Metadata.Label title="Modified" text={listItem.modified} />
                  {/* <RaycastList.Item.Detail.Metadata.Label title="Created" text={listItem.created} /> */}
                  {listItem.state && <RaycastList.Item.Detail.Metadata.Label title="State" text={listItem.state} />}
                </RaycastList.Item.Detail.Metadata>
              }
            />
          }
          actions={
            // add action to transform a private chat to non-private (in case it's no longer saved on server)
            <ActionPanel>
              <Action
                title="View Conversation"
                icon={Icon.AppWindow}
                onAction={() => {
                  push(<ChatHistory chat={listItem.chat} />);
                }}
              />

              <Action.CopyToClipboard
                title="Copy Chat"
                icon={Icon.CopyClipboard}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
                content={JSON.stringify(listItem.chat)}
              />

              {cacheOrBookmarks === "cache" && (
                <Action
                  title="Bookmark"
                  icon={Icon.Bookmark}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  onAction={async () => {
                    Functions.BookmarkChat(listItem.chat, true);
                  }}
                />
              )}

              <Action
                title="Delete Item"
                icon={Icon.Trash}
                shortcut={{ modifiers: ["cmd"], key: "deleteForward" }}
                onAction={async () => {
                  const deleteID = listItem.chat.timestamp;
                  if (cacheOrBookmarks === "cache") {
                    const cache = new RaycastCache();
                    const cachedString: string | undefined = cache.get("cachedChats");
                    const cacheChat: ChatSession[] = cachedString ? JSON.parse(cachedString) : [];
                    const newCache = cacheChat.filter((messages) => messages.timestamp !== deleteID);
                    cache.set("cachedChats", JSON.stringify(newCache));
                    showToast({ title: "Deleted", style: Toast.Style.Success });
                  } else if (cacheOrBookmarks === "bookmarks") {
                    const stringBookmarks = await LocalStorage.getItem("bookmarkedChats");
                    assert(typeof stringBookmarks === "string", "Bookmark not found");
                    const bookmarks: Bookmark[] = JSON.parse(stringBookmarks);
                    const newBookmarks = bookmarks.filter((bookmark) => bookmark.chat.timestamp !== deleteID);
                    LocalStorage.setItem("bookmarkedChats", JSON.stringify(newBookmarks));
                    showToast({ title: "Deleted", style: Toast.Style.Success });
                  }
                  LoadChat();
                }}
              />
            </ActionPanel>
          }
        />
      ));
    }
  }, [list]);

  return <RaycastList isShowingDetail>{memo}</RaycastList>;
}
