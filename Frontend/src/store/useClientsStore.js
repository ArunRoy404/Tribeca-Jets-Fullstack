import { create } from "zustand";

/**
 * Client-only state for the Clients screens.
 *
 * The clients themselves come from the API through `@/hooks/clients`, and the
 * table's search, filters, paging and tab live in the URL via
 * `useClientsTableParams`. What is left here is what the server does not own
 * and a link would not carry: which dialog is open, on which row, and which
 * detail tab is showing.
 *
 * The data array, its filtering and its pagination getters were deleted when
 * this module graduated — see the data-layer section of `Frontend/AGENTS.md`.
 */
export const useClientsStore = create((set) => ({
  activeTab: "overview",

  addModalOpen: false,
  /** The client being edited, or null when adding a new one. */
  editingClient: null,

  followUpModalOpen: false,
  followUpTarget: null,

  archiveModalOpen: false,
  /** Held whole, not by id: the row must stay nameable in the confirmation
   *  dialog even after the list refetches and drops it. */
  archiveTargetClient: null,

  setActiveTab: (activeTab) => set({ activeTab }),

  openAddModal: () => set({ addModalOpen: true, editingClient: null }),
  openEditModal: (client) => set({ addModalOpen: true, editingClient: client }),
  closeAddModal: () => set({ addModalOpen: false, editingClient: null }),

  openFollowUpModal: (client) =>
    set({ followUpModalOpen: true, followUpTarget: client }),
  closeFollowUpModal: () =>
    set({ followUpModalOpen: false, followUpTarget: null }),

  openArchiveModal: (client) =>
    set({ archiveModalOpen: true, archiveTargetClient: client }),
  closeArchiveModal: () =>
    set({ archiveModalOpen: false, archiveTargetClient: null }),
}));
