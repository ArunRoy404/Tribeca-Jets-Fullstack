import { create } from "zustand";

/**
 * Client-only state for the Trip Requests screens.
 *
 * The enquiries themselves come from the API through `@/hooks/trip-requests`,
 * and the table's search, filters, tab and paging live in the URL via
 * `useTripRequestTableParams`. What is left here is what the server does not
 * own and a link would not carry: which dialog is open, and on which row.
 *
 * There is no data array and no `dummyData` file, because this module was
 * built against the API from the first line.
 */
export const useTripRequestsStore = create((set) => ({
  addModalOpen: false,
  /**
   * Held whole rather than by id, so the dialog can still name the row after
   * the list refetches underneath it and drops that row from the page.
   */
  editingRequest: null,

  /** Named "archive", not "delete": nothing in this system is destroyed. */
  archiveModalOpen: false,
  archivingRequest: null,

  openAddModal: () => set({ addModalOpen: true, editingRequest: null }),
  openEditModal: (request) =>
    set({ addModalOpen: true, editingRequest: request }),
  closeAddModal: () => set({ addModalOpen: false, editingRequest: null }),

  openArchiveModal: (request) =>
    set({ archiveModalOpen: true, archivingRequest: request }),
  closeArchiveModal: () =>
    set({ archiveModalOpen: false, archivingRequest: null }),
}));
