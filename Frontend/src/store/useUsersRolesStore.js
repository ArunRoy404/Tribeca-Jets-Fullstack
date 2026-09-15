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
 * What remains is what neither of those should own: which dialog is open and
 * which row the detail sheet is showing.
 */
export const useUsersRolesStore = create((set) => ({
  selectedUserId: null,

  inviteModalOpen: false,
  /** The user being edited, or null when inviting someone new. */
  editingUser: null,

  selectUser: (id) => set({ selectedUserId: id }),
  closeUserDetail: () => set({ selectedUserId: null }),

  openInviteModal: () => set({ inviteModalOpen: true, editingUser: null }),
  openEditUserModal: (user) => set({ inviteModalOpen: true, editingUser: user }),
  closeInviteModal: () => set({ inviteModalOpen: false, editingUser: null }),
}));
