import { request, requestWithMeta } from "@/lib/axios";

/**
 * Thin wrappers around the API's `/receivables` endpoints — the Receivables
 * board, a trip's financial card and a client's Payments tab. Every payment
 * call answers with the whole invoice, so the sheet re-renders from one
 * response rather than re-deriving a balance.
 */
export const receivablesService = {
  list: (params) => requestWithMeta({ url: "/receivables", method: "GET", params }),
  stats: (params) => request({ url: "/receivables/stats", method: "GET", params }),
  detail: (id) => request({ url: `/receivables/${id}`, method: "GET" }),

  create: (payload) => request({ url: "/receivables", method: "POST", data: payload }),
  update: ({ id, ...payload }) => request({ url: `/receivables/${id}`, method: "PATCH", data: payload }),

  remove: (id) => request({ url: `/receivables/${id}`, method: "DELETE" }),
  removeMany: (ids) => request({ url: "/receivables/bulk-delete", method: "POST", data: { ids } }),
  restore: (id) => request({ url: `/receivables/${id}/restore`, method: "POST" }),
  restoreMany: (ids) => request({ url: "/receivables/bulk-restore", method: "POST", data: { ids } }),

  recordPayment: ({ invoiceId, ...payload }) =>
    request({ url: `/receivables/${invoiceId}/payments`, method: "POST", data: payload }),
  updatePayment: ({ invoiceId, paymentId, ...payload }) =>
    request({ url: `/receivables/${invoiceId}/payments/${paymentId}`, method: "PATCH", data: payload }),
  withdrawPayment: ({ invoiceId, paymentId }) =>
    request({ url: `/receivables/${invoiceId}/payments/${paymentId}`, method: "DELETE" }),
  restorePayment: ({ invoiceId, paymentId }) =>
    request({ url: `/receivables/${invoiceId}/payments/${paymentId}/restore`, method: "POST" }),
};
