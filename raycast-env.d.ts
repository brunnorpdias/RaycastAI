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
  /** Preferences accessible in the `quick` command */
  export type Quick = ExtensionPreferences & {}
  /** Preferences accessible in the `assistant` command */
  export type Assistant = ExtensionPreferences & {}
  /** Preferences accessible in the `bookmarks` command */
  export type Bookmarks = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `quick` command */
  export type Quick = {}
  /** Arguments passed to the `assistant` command */
  export type Assistant = {}
  /** Arguments passed to the `bookmarks` command */
  export type Bookmarks = {}
}

