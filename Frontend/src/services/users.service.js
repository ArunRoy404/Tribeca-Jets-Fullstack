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
   * GET /roles
   *
   * Every role with its headcount and, per module, its reach and each action
   * as default, optional or locked — generated from the server's rules.
   */
  roles: () => request({ url: "/roles", method: "GET" }),

  /** GET /roles/:role/defaults — what the invite and edit forms load for a role. */
  roleDefaults: (role) => request({ url: `/roles/${role}/defaults`, method: "GET" }),

  /** GET /users/:id */
  detail: (id) => request({ url: `/users/${id}`, method: "GET" }),

  /**
   * POST /users/invite → { user, invitation: { emailSent, notice } }.
   * `permissions` is `{ MODULE: [ACTION, …] }`; omit it for the role's defaults.
   */
  invite: (payload) =>
    request({ url: "/users/invite", method: "POST", data: payload }),

  /** PATCH /users/:id — send only what changed. */
  update: ({ id, ...payload }) =>
    request({ url: `/users/${id}`, method: "PATCH", data: payload }),

  /**
   * DELETE /users/:id/invitation — permanently deletes an invitation nobody
   * accepted. Any other account is never deleted: suspending is the way out,
   * through `update`.
   */
  withdrawInvitation: (id) => request({ url: `/users/${id}/invitation`, method: "DELETE" }),
};
