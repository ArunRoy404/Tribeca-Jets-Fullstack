import { request, requestWithMeta } from "@/lib/axios";

/**
 * Thin wrappers around the API's `/trips` endpoints (#11).
 *
 * A status change is its own call rather than a field on the PATCH, because
 * the API owns the lifecycle and refuses a move it does not allow. Booking a
 * quote is its own call too: it copies the quote rather than taking a body.
 *
 * No toasts, no redirects, no cache writes — services only talk HTTP.
 */
export const tripsService = {
  /** GET /trips — scoped to the caller's trips; `meta` drives the pager. */
  list: (params) => requestWithMeta({ url: "/trips", method: "GET", params }),

  /** GET /trips/stats — the board tiles. */
  stats: () => request({ url: "/trips/stats", method: "GET" }),

  /** GET /trips/:id — archived trips load too. */
  detail: (id) => request({ url: `/trips/${id}`, method: "GET" }),

  /** POST /trips — a trip booked by hand. */
  create: (payload) => request({ url: "/trips", method: "POST", data: payload }),

  /** POST /trips/from-quote/:quoteId — books an approved quote. */
  bookQuote: ({ quoteId, ...payload }) =>
    request({ url: `/trips/from-quote/${quoteId}`, method: "POST", data: payload }),

  /** PATCH /trips/:id — legs and passengers, when sent, are the full lists. */
  update: ({ id, ...payload }) => request({ url: `/trips/${id}`, method: "PATCH", data: payload }),

  /** POST /trips/:id/status — one step along the lifecycle. */
  changeStatus: ({ id, ...payload }) =>
    request({ url: `/trips/${id}/status`, method: "POST", data: payload }),

  remove: (id) => request({ url: `/trips/${id}`, method: "DELETE" }),
  removeMany: (ids) => request({ url: "/trips/bulk-delete", method: "POST", data: { ids } }),
  restore: (id) => request({ url: `/trips/${id}/restore`, method: "POST" }),
  restoreMany: (ids) => request({ url: "/trips/bulk-restore", method: "POST", data: { ids } }),
};
