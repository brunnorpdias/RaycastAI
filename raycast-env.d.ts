/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `chat_form` command */
  export type ChatForm = ExtensionPreferences & {}
  /** Preferences accessible in the `assistant_form` command */
  export type AssistantForm = ExtensionPreferences & {}
  /** Preferences accessible in the `chat_bookmarks` command */
  export type ChatBookmarks = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `chat_form` command */
  export type ChatForm = {}
  /** Arguments passed to the `assistant_form` command */
  export type AssistantForm = {}
  /** Arguments passed to the `chat_bookmarks` command */
  export type ChatBookmarks = {}
}

