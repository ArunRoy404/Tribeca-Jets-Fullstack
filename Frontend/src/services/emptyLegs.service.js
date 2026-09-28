import { request, requestWithMeta } from "@/lib/axios";

/**
 * Thin wrappers around the API's `/empty-legs` endpoints (#10b).
 *
 * Match, Book and Expire are a `status` on the PATCH — the API accepts any
 * move, because an empty leg's status is the desk's record of an offer, not a
 * lifecycle with rules. No toasts, no redirects, no cache writes.
 */
export const emptyLegsService = {
  /** GET /empty-legs — each row carries `matchCount` / `dateMatchCount`. */
  list: (params) => requestWithMeta({ url: "/empty-legs", method: "GET", params }),

  /** GET /empty-legs/stats — the board tiles. */
  stats: () => request({ url: "/empty-legs/stats", method: "GET" }),

  /** GET /empty-legs/:id — with `matches`, the trip requests on the same route. */
  detail: (id) => request({ url: `/empty-legs/${id}`, method: "GET" }),

  create: (payload) => request({ url: "/empty-legs", method: "POST", data: payload }),
  update: ({ id, ...payload }) => request({ url: `/empty-legs/${id}`, method: "PATCH", data: payload }),

  remove: (id) => request({ url: `/empty-legs/${id}`, method: "DELETE" }),
  removeMany: (ids) => request({ url: "/empty-legs/bulk-delete", method: "POST", data: { ids } }),
  restore: (id) => request({ url: `/empty-legs/${id}/restore`, method: "POST" }),
  restoreMany: (ids) => request({ url: "/empty-legs/bulk-restore", method: "POST", data: { ids } }),
};
