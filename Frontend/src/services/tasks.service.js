import { request, requestWithMeta } from "@/lib/axios";

/**
 * Thin wrappers around the API's `/tasks` endpoints (#20). A column move is a
 * PATCH like any other edit — a task board has no lifecycle to guard.
 *
 * No toasts, no redirects, no cache writes — services only talk HTTP.
 */
export const tasksService = {
  /** GET /tasks — soonest due first; `meta` gives each column its count. */
  list: (params) => requestWithMeta({ url: "/tasks", method: "GET", params }),

  /** GET /tasks/:id — archived tasks load too. */
  detail: (id) => request({ url: `/tasks/${id}`, method: "GET" }),

  create: (payload) => request({ url: "/tasks", method: "POST", data: payload }),

  /** PATCH /tasks/:id — only what is sent changes; `checklist` is the full list. */
  update: ({ id, ...payload }) => request({ url: `/tasks/${id}`, method: "PATCH", data: payload }),

  remove: (id) => request({ url: `/tasks/${id}`, method: "DELETE" }),
  restore: (id) => request({ url: `/tasks/${id}/restore`, method: "POST" }),
};
