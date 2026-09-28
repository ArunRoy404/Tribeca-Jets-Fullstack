import { create } from "zustand";

/**
 * Client-only state for the Quotes screens.
 *
 * The quotes themselves live in React Query — this module graduated when its
 * API landed, so the store's data array, its filters and its CRUD actions are
 * gone. Search, status, page and the rest are in the URL (`useQuotesTableParams`),
 * which is what makes a pasted link reproduce what someone was looking at.
 *
 * What is left is genuinely local: which dialog is open, and which row it was
 * opened from.
 */
export const useQuotesStore = create((set) => ({
  // Add / Edit dialog
  addModalOpen: false,
  /** The mapped row being edited, or null for a new quote. */
  editingQuote: null,
  /**
   * Starting fields for a *new* quote — the instant estimate hands over the
   * route, party size and chosen price this way. Ignored when editing.
   */
  draftQuote: null,

  // Instant estimate (client adjustment #6)
  estimateModalOpen: false,

  // Remove dialog
  deleteModalOpen: false,
  deleteTargetQuote: null,

  openAddQuoteModal: (quote = null, draft = null) =>
    set({ addModalOpen: true, editingQuote: quote, draftQuote: quote ? null : draft }),
  closeAddQuoteModal: () => set({ addModalOpen: false, editingQuote: null, draftQuote: null }),

  openEstimateModal: () => set({ estimateModalOpen: true }),
  closeEstimateModal: () => set({ estimateModalOpen: false }),

  openDeleteQuoteModal: (quote) =>
    set({ deleteModalOpen: true, deleteTargetQuote: quote }),
  closeDeleteQuoteModal: () =>
    set({ deleteModalOpen: false, deleteTargetQuote: null }),
}));
