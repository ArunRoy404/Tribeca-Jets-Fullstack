/**
 * Every React Query key in the app, in one place.
 *
 * Keys are built as arrays so a prefix invalidates everything beneath it:
 * invalidating `["clients"]` also clears `["clients", "detail", id]`.
 */
export const queryKeys = {
  auth: {
    all: ["auth"],
    currentUser: ["auth", "me"],
  },

  users: {
    all: ["users"],
    list: (params) => ["users", "list", params ?? {}],
    detail: (id) => ["users", "detail", id],
    stats: ["users", "stats"],
    /**
     * Static reference data, so it sits outside `list` — invalidating the
     * table must not refetch the permission matrix, which only changes when
     * the backend's rules do.
     */
    roles: ["users", "roles"],
  },

  clients: {
    all: ["clients"],
    list: (filters) => ["clients", "list", filters ?? {}],
    detail: (id) => ["clients", "detail", id],
  },
};
