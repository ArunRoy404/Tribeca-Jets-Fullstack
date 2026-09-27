import { request, requestWithMeta } from "@/lib/axios";

/**
 * Thin wrappers around the API's `/commissions` endpoints — the Commissions
 * screen, a trip's financial card, and the partner portal's Commission Center.
 * The same calls serve all three; the API scopes and projects by role.
 */
export const commissionsService = {
  list: (params) => requestWithMeta({ url: "/commissions", method: "GET", params }),
  stats: () => request({ url: "/commissions/stats", method: "GET" }),
  detail: (id) => request({ url: `/commissions/${id}`, method: "GET" }),

  create: (payload) => request({ url: "/commissions", method: "POST", data: payload }),
  update: ({ id, ...payload }) => request({ url: `/commissions/${id}`, method: "PATCH", data: payload }),

  remove: (id) => request({ url: `/commissions/${id}`, method: "DELETE" }),
  removeMany: (ids) => request({ url: "/commissions/bulk-delete", method: "POST", data: { ids } }),
  restore: (id) => request({ url: `/commissions/${id}/restore`, method: "POST" }),
  restoreMany: (ids) => request({ url: "/commissions/bulk-restore", method: "POST", data: { ids } }),
};
