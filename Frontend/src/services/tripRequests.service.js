import { request, requestWithMeta } from "@/lib/axios";

/**
 * Thin, one-to-one wrappers around the API's `/trip-requests` endpoints.
 *
 * A trip request is the enquiry — what a client asked for, before it becomes a
 * quote or a trip. The Add Lead form writes one of these alongside the client.
 *
 * No toasts, no redirects, no cache writes — services only talk HTTP.
 */
export const tripRequestsService = {
  /** GET /trip-requests — scoped to the caller; `meta` drives the pager. */
  list: (params) =>
    requestWithMeta({ url: "/trip-requests", method: "GET", params }),

  /** GET /trip-requests/stats — counts and pipeline value, scoped like the list. */
  stats: () => request({ url: "/trip-requests/stats", method: "GET" }),

  /** GET /trip-requests/:id */
  detail: (id) => request({ url: `/trip-requests/${id}`, method: "GET" }),

  /** POST /trip-requests — only `clientId` is required. */
  create: (payload) =>
    request({ url: "/trip-requests", method: "POST", data: payload }),

  /** PATCH /trip-requests/:id — also how a request moves through the pipeline. */
  update: ({ id, ...payload }) =>
    request({ url: `/trip-requests/${id}`, method: "PATCH", data: payload }),

  /** DELETE /trip-requests/:id — soft, administrators only. */
  remove: (id) => request({ url: `/trip-requests/${id}`, method: "DELETE" }),

  /** POST /trip-requests/:id/restore */
  restore: (id) =>
    request({ url: `/trip-requests/${id}/restore`, method: "POST" }),

  /** POST /trip-requests/bulk-delete */
  removeMany: (ids) =>
    request({ url: "/trip-requests/bulk-delete", method: "POST", data: { ids } }),

  /** POST /trip-requests/bulk-restore */
  restoreMany: (ids) =>
    request({ url: "/trip-requests/bulk-restore", method: "POST", data: { ids } }),
};
