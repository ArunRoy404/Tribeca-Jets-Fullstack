import { request, requestWithMeta } from "@/lib/axios";

/**
 * Thin, one-to-one wrappers around the API's `/quotes` endpoints.
 *
 * A client quote is what Tribeca Jets sells the flight for — margin and Federal
 * Excise Tax on top of what the operator charges. The operator's own price is a
 * different record (`operatorQuotes.service.js`); `operatorQuoteId` links them.
 *
 * The state changes are separate calls rather than a PATCH with a `status`,
 * because each carries a rule the API enforces: sending stamps the date the
 * client's decision window runs from, and approving refuses a second approval
 * on the same enquiry.
 *
 * No toasts, no redirects, no cache writes — services only talk HTTP.
 */
export const quotesService = {
  /** GET /quotes — scoped to the caller's quotes; `meta` drives the pager. */
  list: (params) => requestWithMeta({ url: "/quotes", method: "GET", params }),

  /** GET /quotes/stats — counts per status, total value, average margin. */
  stats: () => request({ url: "/quotes/stats", method: "GET" }),

  /** GET /quotes/:id — archived quotes load here too. */
  detail: (id) => request({ url: `/quotes/${id}`, method: "GET" }),

  /** GET /quotes/:id/versions — the frozen history, newest first. */
  versions: (id) => request({ url: `/quotes/${id}/versions`, method: "GET" }),

  /** POST /quotes — always a draft at version 1. */
  create: (payload) => request({ url: "/quotes", method: "POST", data: payload }),

  /**
   * POST /quotes/price-preview — a dry run of the same pricing engine a saved
   * quote uses (FET amount, total, margin), for the live preview while a
   * broker is still composing the offer. Persists nothing.
   */
  pricePreview: (payload) =>
    request({ url: "/quotes/price-preview", method: "POST", data: payload }),

  /** PATCH /quotes/:id — a priced change cuts a new version. */
  update: ({ id, ...payload }) =>
    request({ url: `/quotes/${id}`, method: "PATCH", data: payload }),

  /** POST /quotes/:id/send — marks it sent. Does not email anything. */
  send: ({ id, ...payload }) =>
    request({ url: `/quotes/${id}/send`, method: "POST", data: payload }),

  /** POST /quotes/:id/approve — the client accepted. */
  approve: ({ id, ...payload }) =>
    request({ url: `/quotes/${id}/approve`, method: "POST", data: payload }),

  /** POST /quotes/:id/reject — the client declined. */
  reject: ({ id, ...payload }) =>
    request({ url: `/quotes/${id}/reject`, method: "POST", data: payload }),

  /** POST /quotes/:id/expire — the desk lets the offer lapse. */
  expire: ({ id, ...payload }) =>
    request({ url: `/quotes/${id}/expire`, method: "POST", data: payload }),

  /** POST /quotes/:id/reopen — undoes a decision. */
  reopen: (id) => request({ url: `/quotes/${id}/reopen`, method: "POST" }),

  /** POST /quotes/:id/duplicate — a fresh draft with the same figures. */
  duplicate: (id) => request({ url: `/quotes/${id}/duplicate`, method: "POST" }),

  /** DELETE /quotes/:id — soft, administrators only. */
  remove: (id) => request({ url: `/quotes/${id}`, method: "DELETE" }),

  /** POST /quotes/:id/restore */
  restore: (id) => request({ url: `/quotes/${id}/restore`, method: "POST" }),

  /** POST /quotes/bulk-delete — POST, because a DELETE body is dropped by proxies. */
  removeMany: (ids) =>
    request({ url: "/quotes/bulk-delete", method: "POST", data: { ids } }),

  /** POST /quotes/bulk-restore */
  restoreMany: (ids) =>
    request({ url: "/quotes/bulk-restore", method: "POST", data: { ids } }),
};
