import { request, requestWithMeta } from "@/lib/axios";

/**
 * Thin wrappers around the API's `/documents` endpoints (Document Vault,
 * #22). A document's file opens at `/documents/:id/file` — see
 * `documentFileHref` in `lib/document.js`. No toasts, no redirects, no cache
 * writes — services only talk HTTP.
 */
export const documentsService = {
  list: (params) => requestWithMeta({ url: "/documents", method: "GET", params }),
  stats: (params) => request({ url: "/documents/stats", method: "GET", params }),
  detail: (id) => request({ url: `/documents/${id}`, method: "GET" }),

  create: (payload) => request({ url: "/documents", method: "POST", data: payload }),
  update: ({ id, ...payload }) => request({ url: `/documents/${id}`, method: "PATCH", data: payload }),
  remove: (id) => request({ url: `/documents/${id}`, method: "DELETE" }),
  restore: (id) => request({ url: `/documents/${id}/restore`, method: "POST" }),
  removeMany: (ids) => request({ url: "/documents/bulk-delete", method: "POST", data: { ids } }),
  restoreMany: (ids) => request({ url: "/documents/bulk-restore", method: "POST", data: { ids } }),
};
