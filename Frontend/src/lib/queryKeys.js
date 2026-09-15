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

  clients: {
    all: ["clients"],
    list: (filters) => ["clients", "list", filters ?? {}],
    detail: (id) => ["clients", "detail", id],
  },
};
