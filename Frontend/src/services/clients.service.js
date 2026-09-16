import { request, requestWithMeta } from "@/lib/axios";

/**
 * Thin, one-to-one wrappers around the API's `/clients` endpoints.
 *
 * No toasts, no redirects, no cache writes — services only talk HTTP. Every
 * side effect lives in the hooks.
 */
export const clientsService = {
  /**
   * GET /clients
   *
   * `requestWithMeta` because paging is entirely server-side, and because the
   * result is already scoped: a broker's `meta.total` counts their own book,
   * not the company's.
   */
  list: (params) => requestWithMeta({ url: "/clients", method: "GET", params }),

  /** GET /clients/stats — the tiles above the table, scoped like the list. */
  stats: () => request({ url: "/clients/stats", method: "GET" }),

  /** GET /clients/:id */
  detail: (id) => request({ url: `/clients/${id}`, method: "GET" }),

  /** POST /clients */
  create: (payload) => request({ url: "/clients", method: "POST", data: payload }),

  /** PATCH /clients/:id — send only what changed. */
  update: ({ id, ...payload }) =>
    request({ url: `/clients/${id}`, method: "PATCH", data: payload }),

  /** DELETE /clients/:id — soft delete; responds 204 with no body. */
  remove: (id) => request({ url: `/clients/${id}`, method: "DELETE" }),

  /**
   * POST /clients/:id/restore — clears the deletion stamp and nothing else,
   * so the record comes back exactly as it was.
   */
  restore: (id) => request({ url: `/clients/${id}/restore`, method: "POST" }),

  /** POST /clients/bulk-delete — soft-removes several at once. */
  removeMany: (ids) =>
    request({ url: "/clients/bulk-delete", method: "POST", data: { ids } }),

  /** POST /clients/bulk-restore — brings several archived ones back at once. */
  restoreMany: (ids) =>
    request({ url: "/clients/bulk-restore", method: "POST", data: { ids } }),
};
