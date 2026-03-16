/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as characters from "../characters.js";
import type * as chat from "../chat.js";
import type * as generateTheme from "../generateTheme.js";
import type * as guests from "../guests.js";
import type * as lib_claude from "../lib/claude.js";
import type * as parseCharacters from "../parseCharacters.js";
import type * as parseInvite from "../parseInvite.js";
import type * as parties from "../parties.js";
import type * as storage from "../storage.js";
import type * as votes from "../votes.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  characters: typeof characters;
  chat: typeof chat;
  generateTheme: typeof generateTheme;
  guests: typeof guests;
  "lib/claude": typeof lib_claude;
  parseCharacters: typeof parseCharacters;
  parseInvite: typeof parseInvite;
  parties: typeof parties;
  storage: typeof storage;
  votes: typeof votes;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
