import { request, requestWithMeta } from "@/lib/axios";

/**
 * Thin wrappers around the API's `/operator-payments` endpoints — the
 * Operator Payments board, a trip's financial card and an operator's Payments
 * tab. Every payment call answers with the whole bill.
 */
export const operatorPaymentsService = {
  list: (params) => requestWithMeta({ url: "/operator-payments", method: "GET", params }),
  stats: (params) => request({ url: "/operator-payments/stats", method: "GET", params }),
  detail: (id) => request({ url: `/operator-payments/${id}`, method: "GET" }),

  create: (payload) => request({ url: "/operator-payments", method: "POST", data: payload }),
  update: ({ id, ...payload }) => request({ url: `/operator-payments/${id}`, method: "PATCH", data: payload }),

  remove: (id) => request({ url: `/operator-payments/${id}`, method: "DELETE" }),
  removeMany: (ids) => request({ url: "/operator-payments/bulk-delete", method: "POST", data: { ids } }),
  restore: (id) => request({ url: `/operator-payments/${id}/restore`, method: "POST" }),
  restoreMany: (ids) => request({ url: "/operator-payments/bulk-restore", method: "POST", data: { ids } }),

  recordPayment: ({ payableId, ...payload }) =>
    request({ url: `/operator-payments/${payableId}/payments`, method: "POST", data: payload }),
  updatePayment: ({ payableId, paymentId, ...payload }) =>
    request({ url: `/operator-payments/${payableId}/payments/${paymentId}`, method: "PATCH", data: payload }),
  withdrawPayment: ({ payableId, paymentId }) =>
    request({ url: `/operator-payments/${payableId}/payments/${paymentId}`, method: "DELETE" }),
  restorePayment: ({ payableId, paymentId }) =>
    request({ url: `/operator-payments/${payableId}/payments/${paymentId}/restore`, method: "POST" }),
};
