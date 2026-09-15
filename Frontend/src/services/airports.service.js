import { request, requestWithMeta } from "@/lib/axios";

/**
 * Thin, one-to-one wrappers around the API's `/airports` endpoints.
 *
 * No toasts, no redirects, no cache writes — services only talk HTTP. Every
 * side effect lives in the hooks.
 */
export const airportsService = {
  /**
   * GET /airports
   *
   * `requestWithMeta` because paging is entirely server-side: the caller needs
   * `meta.totalPages` and `meta.total`, not just the rows.
   */
  list: (params) => requestWithMeta({ url: "/airports", method: "GET", params }),

  /** GET /airports/stats — the tiles above the table. */
  stats: () => request({ url: "/airports/stats", method: "GET" }),

  /**
   * GET /airports/countries
   *
   * The country filter's options, derived from the stored rows. The UI used to
   * hardcode five countries, which was wrong the moment anyone added a sixth.
   */
  countries: () => request({ url: "/airports/countries", method: "GET" }),

  /** GET /airports/:id */
  detail: (id) => request({ url: `/airports/${id}`, method: "GET" }),

  /** POST /airports — re-adding a removed ICAO restores that airport. */
  create: (payload) => request({ url: "/airports", method: "POST", data: payload }),

  /** PATCH /airports/:id — send only what changed. */
  update: ({ id, ...payload }) =>
    request({ url: `/airports/${id}`, method: "PATCH", data: payload }),

  /** DELETE /airports/:id — soft delete; responds 204 with no body. */
  remove: (id) => request({ url: `/airports/${id}`, method: "DELETE" }),

  /**
   * POST /airports/:id/restore
   *
   * Clears the deletion stamp and nothing else, so the record comes back
   * exactly as it was. The only restore path — create refuses an archived ICAO.
   */
  restore: (id) => request({ url: `/airports/${id}/restore`, method: "POST" }),

  /**
   * POST /airports/bulk-delete — soft-removes several at once.
   *
   * POST rather than DELETE because request bodies on DELETE are unreliable
   * through proxies, and a silently dropped body would remove nothing while
   * reporting success.
   */
  removeMany: (ids) =>
    request({ url: "/airports/bulk-delete", method: "POST", data: { ids } }),
};
