import { List as RaycastList, ActionPanel, Action, Icon, useNavigation } from "@raycast/api";
// import ChatForm from './chat_form';
import Bookmarks from "./bookmarks";
import Cache from "./cache";


// export default function Index() {
export default function Options() {
  const { push } = useNavigation();
  return (
    // Try to remove the search bar
    <RaycastList filtering={false} >
      {/* <RaycastList.Item */}
      {/*   title={"Chat"} */}
      {/*   subtitle={"Create a quick chat with different llms"} */}
      {/*   icon={Icon.Message} */}
      {/*   actions={ */}
      {/*     <ActionPanel> */}
      {/*       <Action */}
      {/*         title="Open Chat" */}
      {/*         icon={Icon.Message} */}
      {/*         onAction={() => { */}
      {/*           push(<ChatForm />) */}
      {/*         }} */}
      {/*       /> */}
      {/*     </ActionPanel> */}
      {/*   } */}
      {/* /> */}

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
                push(<Cache />)
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
                push(<Bookmarks />)
              }}
            />
          </ActionPanel>
        }
      />

    </RaycastList>
  );
};
