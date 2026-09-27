import { create } from "zustand";

/**
 * Client-only state for the Empty Legs board.
 *
 * The legs themselves come from the API through `@/hooks/empty-legs`; the
 * filters, page and open detail sheet live in the URL. What is left is which
 * dialog is open and the raw leg it is editing — nothing the server owns.
 */
export const useEmptyLegsStore = create((set) => ({
  addModalOpen: false,
  editingLeg: null,

  openAddModal: () => set({ addModalOpen: true, editingLeg: null }),
  openEditModal: (leg) => set({ addModalOpen: true, editingLeg: leg }),
  closeAddModal: () => set({ addModalOpen: false, editingLeg: null }),
}));
