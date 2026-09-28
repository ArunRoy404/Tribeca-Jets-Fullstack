import { request, requestWithMeta } from "@/lib/axios";

/**
 * Thin wrappers around the API's `/email-templates` and `/emails` endpoints
 * (#21). Preview fills a template for a recipient and writes nothing; send
 * delivers it and records it.
 *
 * No toasts, no redirects, no cache writes — services only talk HTTP.
 */
export const emailTemplatesService = {
  list: (params) => requestWithMeta({ url: "/email-templates", method: "GET", params }),
  detail: (id) => request({ url: `/email-templates/${id}`, method: "GET" }),
  stats: (params) => request({ url: "/email-templates/stats", method: "GET", params }),
  /** The merge-field catalogue — the one list the editor, the save check and the send read. */
  fields: () => request({ url: "/email-templates/fields", method: "GET" }),

  create: (payload) => request({ url: "/email-templates", method: "POST", data: payload }),
  update: ({ id, ...payload }) => request({ url: `/email-templates/${id}`, method: "PATCH", data: payload }),
  remove: (id) => request({ url: `/email-templates/${id}`, method: "DELETE" }),
  restore: (id) => request({ url: `/email-templates/${id}/restore`, method: "POST" }),
  removeMany: (ids) => request({ url: "/email-templates/bulk-delete", method: "POST", data: { ids } }),
  restoreMany: (ids) => request({ url: "/email-templates/bulk-restore", method: "POST", data: { ids } }),
};

export const emailsService = {
  /** GET /emails — the sent log, newest first. */
  list: (params) => requestWithMeta({ url: "/emails", method: "GET", params }),
  detail: (id) => request({ url: `/emails/${id}`, method: "GET" }),
  /** POST /emails/preview — the template filled for this recipient, and what could not be filled. */
  preview: (payload) => request({ url: "/emails/preview", method: "POST", data: payload }),
  send: (payload) => request({ url: "/emails", method: "POST", data: payload }),
};
