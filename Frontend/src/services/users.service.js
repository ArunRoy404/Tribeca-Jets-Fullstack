import { request, requestWithMeta } from "@/lib/axios";

/**
 * Thin, one-to-one wrappers around the API's `/users` endpoints.
 *
 * No toasts, no redirects, no cache writes — services only talk HTTP. Every
 * side effect lives in the hooks.
 */
export const usersService = {
  /**
   * GET /users
   *
   * Uses `requestWithMeta` because paging is entirely server-side: the caller
   * needs `meta.totalPages` and `meta.total`, not just the rows.
   *
   * Params are passed through as given. Undefined entries are dropped by axios,
   * so omitting a filter means "all" rather than sending an empty string the
   * API would reject.
   */
  list: (params) =>
    requestWithMeta({ url: "/users", method: "GET", params }),

  /** GET /users/stats — the tiles above the table. */
  stats: () => request({ url: "/users/stats", method: "GET" }),

  /**
   * GET /users/roles
   *
   * Roles, their live headcounts and the permission matrix, generated from the
   * server-side rules rather than duplicated in the frontend.
   */
  roles: () => request({ url: "/users/roles", method: "GET" }),

  /** GET /users/:id */
  detail: (id) => request({ url: `/users/${id}`, method: "GET" }),

  /** POST /users/invite → { user, invitation: { emailSent, notice } } */
  invite: (payload) =>
    request({ url: "/users/invite", method: "POST", data: payload }),

  /** PATCH /users/:id — send only what changed. */
  update: ({ id, ...payload }) =>
    request({ url: `/users/${id}`, method: "PATCH", data: payload }),

  // No remove or restore: a staff account is never deleted. Suspending is the
  // way out, and that goes through `update`.
};
