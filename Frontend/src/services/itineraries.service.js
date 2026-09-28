import { request, requestWithMeta } from "@/lib/axios";

/**
 * Thin wrappers around the API's `/itineraries` endpoints (#12).
 *
 * Confirming and sending are their own calls rather than fields on the PATCH,
 * the same split Trips makes for its status: the API owns what each means and
 * stamps who did it and when. No toasts, no navigation, no cache access.
 */
export const itinerariesService = {
  /** GET /itineraries — scoped to the caller's trips; `meta` drives the pager. */
  list: (params) => requestWithMeta({ url: "/itineraries", method: "GET", params }),

  /** GET /itineraries/stats — the board tiles. */
  stats: () => request({ url: "/itineraries/stats", method: "GET" }),

  /** GET /itineraries/:id — archived documents load too. */
  detail: (id) => request({ url: `/itineraries/${id}`, method: "GET" }),

  /** POST /itineraries — one document for the trip named by `tripId`. */
  create: (payload) => request({ url: "/itineraries", method: "POST", data: payload }),

  /** PATCH /itineraries/:id */
  update: ({ id, ...payload }) => request({ url: `/itineraries/${id}`, method: "PATCH", data: payload }),

  /** POST /itineraries/:id/confirm — idempotent. */
  confirm: (id) => request({ url: `/itineraries/${id}/confirm`, method: "POST" }),

  /** POST /itineraries/:id/send — marks it sent; does not deliver it. */
  send: (id) => request({ url: `/itineraries/${id}/send`, method: "POST" }),

  remove: (id) => request({ url: `/itineraries/${id}`, method: "DELETE" }),
  removeMany: (ids) => request({ url: "/itineraries/bulk-delete", method: "POST", data: { ids } }),
  restore: (id) => request({ url: `/itineraries/${id}/restore`, method: "POST" }),
  restoreMany: (ids) => request({ url: "/itineraries/bulk-restore", method: "POST", data: { ids } }),
};
