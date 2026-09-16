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
    list: (params) => ["clients", "list", params ?? {}],
    detail: (id) => ["clients", "detail", id],
    stats: ["clients", "stats"],
  },

  airports: {
    all: ["airports"],
    list: (params) => ["airports", "list", params ?? {}],
    detail: (id) => ["airports", "detail", id],
    stats: ["airports", "stats"],
    /**
     * The country filter's options. Outside `list` because it changes only
     * when an airport is added or removed, not when the table is filtered.
     */
    countries: ["airports", "countries"],
  },

  operators: {
    all: ["operators"],
    list: (params) => ["operators", "list", params ?? {}],
    detail: (id) => ["operators", "detail", id],
    stats: ["operators", "stats"],
  },

  aircraft: {
    all: ["aircraft"],
    list: (params) => ["aircraft", "list", params ?? {}],
    detail: (id) => ["aircraft", "detail", id],
    stats: ["aircraft", "stats"],
    /**
     * The cabin-preference filter's options. Outside `list` because they
     * change only when an aircraft is added or edited, not when the table is
     * filtered — the same reasoning as the airports country filter.
     */
    amenities: ["aircraft", "amenities"],
  },
};
