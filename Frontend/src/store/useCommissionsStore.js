import { create } from "zustand";

/**
 * Client-only state for the Commissions board: which dialog is open and what
 * it is editing. The commissions come from `@/hooks/commissions`, and the
 * filters, page and open sheet live in the URL.
 *
 * `draft` pre-fills a new commission — the trip page's "Add commission" hands
 * over its trip, so the desk does not pick it twice.
 */
export const useCommissionsStore = create((set) => ({
  addModalOpen: false,
  editingCommission: null,
  draft: null,

  openAddModal: (draft = null) => set({ addModalOpen: true, editingCommission: null, draft }),
  openEditModal: (commission) => set({ addModalOpen: true, editingCommission: commission, draft: null }),
  closeAddModal: () => set({ addModalOpen: false, editingCommission: null, draft: null }),
}));
