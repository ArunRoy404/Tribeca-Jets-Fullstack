import { create } from "zustand";

/**
 * Client-only state for the Users & Roles screen.
 *
 * Deliberately small. The directory itself, its filters, paging and sort are
 * *not* here:
 *
 * - The rows come from React Query (`src/hooks/users/`), which owns caching,
 *   refetching and invalidation. Mirroring server data into a store means
 *   keeping two copies in sync, and the store's copy always loses.
 * - Table state lives in the URL (`useUsersTableParams`), so a link reproduces
 *   the exact view and back/forward work.
 *
 * What remains is what neither of those should own: which row the detail
 * sheet is showing. Invite and Edit are their own pages (7 Oct 2026).
 */
export const useUsersRolesStore = create((set) => ({
  selectedUserId: null,

  selectUser: (id) => set({ selectedUserId: id }),
  closeUserDetail: () => set({ selectedUserId: null }),
}));
