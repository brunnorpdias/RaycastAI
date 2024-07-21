import { List as RaycastList, ActionPanel, Action, Icon, useNavigation } from "@raycast/api";
import ChatForm from './chat_form';
import AssistantForm from "./assistant_form";
import Bookmarks from "./bookmarks";


export default function Index() {
  const { push } = useNavigation();
  return (
    // Try to remove the search bar
    <RaycastList filtering={false} >
      <RaycastList.Item
        title={"Chat"}
        icon={Icon.Message}
        actions={
          <ActionPanel>
            <Action
              title="Open Chat"
              icon={Icon.Message}
              onAction={() => {
                push(<ChatForm />)
              }}
            />
          </ActionPanel>
        }
      />
      <RaycastList.Item
        title={"Assistant"}
        icon={Icon.Upload}
        actions={
          <ActionPanel>
            <Action
              title="Open Assistant"
              icon={Icon.Upload}
              onAction={() => {
                push(<AssistantForm />)
              }}
            />
          </ActionPanel>
        }
      />
      <RaycastList.Item
        title={"Bookmarked Chats and Assistants"}
        icon={Icon.Sidebar}
        actions={
          <ActionPanel>
            <Action
              title="Open Bookmarks"
              icon={Icon.Sidebar}
              onAction={() => {
                push(<Bookmarks />)
              }}
            />
          </ActionPanel>
        }
      />
    </RaycastList>
  );
};
