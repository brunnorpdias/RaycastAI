import { List as RaycastList, ActionPanel, Action, Icon, useNavigation } from "@raycast/api";
import CacheAndBookmarks from "./views/cache_bookmarks";


export default function Saved() {
  const { push } = useNavigation();
  return (
    // Try to remove the search bar
    <RaycastList filtering={false} >

      <RaycastList.Item
        title={"Cache"}
        subtitle={"View cached chats and assistant threads"}
        icon={Icon.Sidebar}
        actions={
          <ActionPanel>
            <Action
              title="Open Cache"
              icon={Icon.Sidebar}
              onAction={() => {
                // push(<Cache />)
                push(<CacheAndBookmarks cacheOrBookmarks={'cache'} />)
              }}
            />
          </ActionPanel>
        }
      />

      <RaycastList.Item
        title={"Bookmarks"}
        subtitle={"View bookmarked chats and assistant threads"}
        icon={Icon.Bookmark}
        actions={
          <ActionPanel>
            <Action
              title="Open Bookmarks"
              icon={Icon.Bookmark}
              onAction={() => {
                // push(<Bookmarks />)
                push(<CacheAndBookmarks cacheOrBookmarks={'bookmarks'} />)
              }}
            />
          </ActionPanel>
        }
      />

    </RaycastList>
  );
};
