/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as authHelpers from "../authHelpers.js";
import type * as borrowRequests from "../borrowRequests.js";
import type * as crons from "../crons.js";
import type * as dateUtils from "../dateUtils.js";
import type * as http from "../http.js";
import type * as loans from "../loans.js";
import type * as outbox from "../outbox.js";
import type * as tools from "../tools.js";
import type * as users from "../users.js";
import type * as webhookSecurity from "../webhookSecurity.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  authHelpers: typeof authHelpers;
  borrowRequests: typeof borrowRequests;
  crons: typeof crons;
  dateUtils: typeof dateUtils;
  http: typeof http;
  loans: typeof loans;
  outbox: typeof outbox;
  tools: typeof tools;
  users: typeof users;
  webhookSecurity: typeof webhookSecurity;
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
