import { request, requestWithMeta } from "@/lib/axios";

/**
 * Thin, one-to-one wrappers around the API's `/aircraft` endpoints.
 *
 * No toasts, no redirects, no cache writes — services only talk HTTP.
 */
export const aircraftService = {
  /** GET /aircraft — server-side paging, so `meta` is needed alongside rows. */
  list: (params) => requestWithMeta({ url: "/aircraft", method: "GET", params }),

  /** GET /aircraft/stats — the tiles above the table. */
  stats: () => request({ url: "/aircraft/stats", method: "GET" }),

  /**
   * GET /aircraft/amenities — distinct cabin features, for the preference
   * filter. Derived from the stored rows, so the dropdown can never offer a
   * feature nothing matches.
   */
  amenities: () => request({ url: "/aircraft/amenities", method: "GET" }),

  /**
   * GET /aircraft/:id
   *
   * Carries an empty `tripHistory` array for the detail page's Trips tab until
   * the Trips module exists.
   */
  detail: (id) => request({ url: `/aircraft/${id}`, method: "GET" }),

  /** POST /aircraft */
  create: (payload) => request({ url: "/aircraft", method: "POST", data: payload }),

  /**
   * PATCH /aircraft/:id — send only what changed. `amenities` is replaced
   * whole, and this is also how a tail is grounded: send `{ status }`.
   */
  update: ({ id, ...payload }) =>
    request({ url: `/aircraft/${id}`, method: "PATCH", data: payload }),

  /** DELETE /aircraft/:id — soft delete; responds 204 with no body. */
  remove: (id) => request({ url: `/aircraft/${id}`, method: "DELETE" }),

  /**
   * POST /aircraft/:id/restore — clears the deletion stamp and nothing else,
   * so the record comes back exactly as it was, tail number included.
   */
  restore: (id) => request({ url: `/aircraft/${id}/restore`, method: "POST" }),

  /** POST /aircraft/bulk-delete — soft-removes several at once. */
  removeMany: (ids) =>
    request({ url: "/aircraft/bulk-delete", method: "POST", data: { ids } }),

  /** POST /aircraft/bulk-restore — brings several archived ones back at once. */
  restoreMany: (ids) =>
    request({ url: "/aircraft/bulk-restore", method: "POST", data: { ids } }),
};
