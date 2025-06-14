import { List as RaycastList, ActionPanel, Action, Icon, useNavigation } from "@raycast/api";
import CacheAndBookmarks from "./views/cache_bookmarks";


export default function Saved() {
  const { push } = useNavigation();
  return (
    // Try to remove the search bar
    // setup groups of conversations around a specific subject
    <RaycastList>

      <RaycastList.Item
        // show the size of the cache and bookmarks
        title={"Cache"}
        subtitle={"View cached chats"}
        icon={Icon.Sidebar}
        actions={
          <ActionPanel>
            <Action
              title="Open Cache"
              icon={Icon.Sidebar}
              onAction={() => {
                push(<CacheAndBookmarks cacheOrBookmarks={'cache'} />)
              }}
            />
          </ActionPanel>
        }
      />

      <RaycastList.Item
        title={"Bookmarks"}
        subtitle={"View bookmarked chats"}
        icon={Icon.Bookmark}
        actions={
          <ActionPanel>
            <Action
              title="Open Bookmarks"
              icon={Icon.Bookmark}
              onAction={() => {
                push(<CacheAndBookmarks cacheOrBookmarks={'bookmarks'} />)
              }}
            />
          </ActionPanel>
        }
      />

    </RaycastList>
  );
};
