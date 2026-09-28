import { request, requestWithMeta } from "@/lib/axios";

/**
 * Thin wrappers around the API's `/schedule` endpoints (#13) — read-only.
 *
 * No toasts, no redirects, no cache writes — services only talk HTTP.
 */
export const scheduleService = {
  /** GET /schedule — legs departing in [from, to] (at most 42 days); `meta` says how many. */
  list: (params) => requestWithMeta({ url: "/schedule", method: "GET", params }),

  /** GET /schedule/stats — the tiles, under the same filters. */
  stats: (params) => request({ url: "/schedule/stats", method: "GET", params }),

  /** GET /schedule/calendar — a year of legs counted per month and per day. */
  calendar: (params) => request({ url: "/schedule/calendar", method: "GET", params }),
};
