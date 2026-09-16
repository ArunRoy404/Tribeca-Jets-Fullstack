import { request, requestWithMeta } from "@/lib/axios";

/**
 * Thin, one-to-one wrappers around the API's `/operators` endpoints.
 *
 * No toasts, no redirects, no cache writes — services only talk HTTP.
 */
export const operatorsService = {
  /** GET /operators — server-side paging, so `meta` is needed alongside rows. */
  list: (params) => requestWithMeta({ url: "/operators", method: "GET", params }),

  /** GET /operators/stats — the tiles above the table. */
  stats: () => request({ url: "/operators/stats", method: "GET" }),

  /**
   * GET /operators/:id
   *
   * Carries empty `fleet`, `tripHistory` and `payments` arrays for the detail
   * page's tabs until the Aircraft, Trips and Payments modules exist.
   */
  detail: (id) => request({ url: `/operators/${id}`, method: "GET" }),

  /** POST /operators */
  create: (payload) => request({ url: "/operators", method: "POST", data: payload }),

  /** PATCH /operators/:id — send only what changed. Arrays are replaced whole. */
  update: ({ id, ...payload }) =>
    request({ url: `/operators/${id}`, method: "PATCH", data: payload }),

  /** DELETE /operators/:id — soft delete; responds 204 with no body. */
  remove: (id) => request({ url: `/operators/${id}`, method: "DELETE" }),

  /**
   * POST /operators/:id/restore — clears the deletion stamp and nothing else,
   * so the record comes back exactly as it was.
   */
  restore: (id) => request({ url: `/operators/${id}/restore`, method: "POST" }),

  /** POST /operators/bulk-delete — soft-removes several at once. */
  removeMany: (ids) =>
    request({ url: "/operators/bulk-delete", method: "POST", data: { ids } }),

  /** POST /operators/bulk-restore — brings several archived ones back at once. */
  restoreMany: (ids) =>
    request({ url: "/operators/bulk-restore", method: "POST", data: { ids } }),
};
