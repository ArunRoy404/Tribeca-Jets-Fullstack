import { create } from "zustand";

/**
 * Client-only state for the Operators screens.
 *
 * The operators themselves come from the API through `@/hooks/operators`, and
 * the table's search, status filter and paging live in the URL via
 * `useOperatorsTableParams`. What is left here is what the server does not own
 * and a link would not carry: which dialog is open, on which row, and which
 * detail tab is showing.
 *
 * The data array, its filtering and its pagination getters were deleted when
 * this module graduated — see the data-layer section of `Frontend/AGENTS.md`.
 */
export const useOperatorsStore = create((set) => ({
  activeTab: "overview",

  addModalOpen: false,
  editingOperator: null,
  quoteModalOpen: false,
  quoteTargetOperator: null,

  deleteModalOpen: false,
  /** Held whole, not by id: the row must stay nameable in the confirmation
   *  dialog even after the list refetches and drops it. */
  deletingOperator: null,

  setActiveTab: (activeTab) => set({ activeTab }),

  openAddModal: () => set({ addModalOpen: true, editingOperator: null }),
  openEditModal: (operator) => set({ addModalOpen: true, editingOperator: operator }),
  closeAddModal: () => set({ addModalOpen: false, editingOperator: null }),

  openQuoteModal: (operator) => set({ quoteModalOpen: true, quoteTargetOperator: operator }),
  closeQuoteModal: () => set({ quoteModalOpen: false, quoteTargetOperator: null }),

  openDeleteModal: (operator) => set({ deleteModalOpen: true, deletingOperator: operator }),
  closeDeleteModal: () => set({ deleteModalOpen: false, deletingOperator: null }),
}));
