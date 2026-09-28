import { request, requestWithMeta } from "@/lib/axios";

/**
 * Thin wrappers around the API's `/flight-tracking` endpoints (#14). A flight's
 * written updates are notes (subject FLIGHT) and go through the notes service.
 *
 * No toasts, no redirects, no cache writes — services only talk HTTP.
 */
export const flightTrackingService = {
  /** GET /flight-tracking — flights (trip legs), nearest first; `meta` drives the pager. */
  list: (params) => requestWithMeta({ url: "/flight-tracking", method: "GET", params }),

  /** GET /flight-tracking/stats — the tiles, under the same trip filters. */
  stats: (params) => request({ url: "/flight-tracking/stats", method: "GET", params }),

  /** GET /flight-tracking/:legId — archived legs and trips load too. */
  detail: (legId) => request({ url: `/flight-tracking/${legId}`, method: "GET" }),

  /** PATCH /flight-tracking/:legId — a report: status, arrival estimate, link, note. */
  update: ({ id, ...payload }) => request({ url: `/flight-tracking/${id}`, method: "PATCH", data: payload }),
};
