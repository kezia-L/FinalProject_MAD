/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as aiChat from "../aiChat.js";
import type * as aiPlanner from "../aiPlanner.js";
import type * as aiProgress from "../aiProgress.js";
import type * as aiScan from "../aiScan.js";
import type * as foodLogs from "../foodLogs.js";
import type * as foods from "../foods.js";
import type * as googleAuth from "../googleAuth.js";
import type * as http from "../http.js";
import type * as images from "../images.js";
import type * as mealPlans from "../mealPlans.js";
import type * as scanHistory from "../scanHistory.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aiChat: typeof aiChat;
  aiPlanner: typeof aiPlanner;
  aiProgress: typeof aiProgress;
  aiScan: typeof aiScan;
  foodLogs: typeof foodLogs;
  foods: typeof foods;
  googleAuth: typeof googleAuth;
  http: typeof http;
  images: typeof images;
  mealPlans: typeof mealPlans;
  scanHistory: typeof scanHistory;
  users: typeof users;
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
