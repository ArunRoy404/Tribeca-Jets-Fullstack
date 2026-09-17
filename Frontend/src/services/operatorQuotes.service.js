import { request, requestWithMeta } from "@/lib/axios";

/**
 * Thin, one-to-one wrappers around the API's `/operator-quotes` endpoints.
 *
 * An operator quote is what one operator came back with on one enquiry — the
 * buy price, before margin and FET. The client-facing quote is a different
 * record and arrives with the Quotes module.
 *
 * The state changes are separate calls rather than a PATCH with a `status`,
 * because each carries a rule the API enforces: approving checks that no other
 * quote on the enquiry is already approved, and recording a response stamps the
 * clock the operator scorecard is measured with.
 *
 * No toasts, no redirects, no cache writes — services only talk HTTP.
 */
export const operatorQuotesService = {
  /** GET /operator-quotes — scoped through the enquiry; `meta` drives the pager. */
  list: (params) =>
    requestWithMeta({ url: "/operator-quotes", method: "GET", params }),

  /** GET /operator-quotes/stats — counts by state and average response time. */
  stats: () => request({ url: "/operator-quotes/stats", method: "GET" }),

  /** GET /operator-quotes/:id */
  detail: (id) => request({ url: `/operator-quotes/${id}`, method: "GET" }),

  /** POST /operator-quotes — asks an operator, and moves the enquiry to SOURCING. */
  create: (payload) =>
    request({ url: "/operator-quotes", method: "POST", data: payload }),

  /** PATCH /operator-quotes/:id — corrects the ask or the answer, never the state. */
  update: ({ id, ...payload }) =>
    request({ url: `/operator-quotes/${id}`, method: "PATCH", data: payload }),

  /** POST /operator-quotes/:id/response — the operator came back. */
  recordResponse: ({ id, ...payload }) =>
    request({ url: `/operator-quotes/${id}/response`, method: "POST", data: payload }),

  /** POST /operator-quotes/:id/approve — chooses this operator for the trip. */
  approve: ({ id, ...payload }) =>
    request({ url: `/operator-quotes/${id}/approve`, method: "POST", data: payload }),

  /** POST /operator-quotes/:id/reject — ruled out, but kept in the comparison. */
  reject: ({ id, ...payload }) =>
    request({ url: `/operator-quotes/${id}/reject`, method: "POST", data: payload }),

  /** POST /operator-quotes/:id/decline — the operator said no. */
  decline: ({ id, ...payload }) =>
    request({ url: `/operator-quotes/${id}/decline`, method: "POST", data: payload }),

  /** POST /operator-quotes/:id/reopen — undoes a decision. */
  reopen: (id) =>
    request({ url: `/operator-quotes/${id}/reopen`, method: "POST" }),

  /** DELETE /operator-quotes/:id — soft, administrators only. */
  remove: (id) => request({ url: `/operator-quotes/${id}`, method: "DELETE" }),

  /** POST /operator-quotes/:id/restore */
  restore: (id) =>
    request({ url: `/operator-quotes/${id}/restore`, method: "POST" }),

  /** POST /operator-quotes/bulk-delete */
  removeMany: (ids) =>
    request({ url: "/operator-quotes/bulk-delete", method: "POST", data: { ids } }),

  /** POST /operator-quotes/bulk-restore */
  restoreMany: (ids) =>
    request({ url: "/operator-quotes/bulk-restore", method: "POST", data: { ids } }),
};
