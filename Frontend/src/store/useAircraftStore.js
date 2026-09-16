import { create } from "zustand";

/**
 * Client-only state for the Aircraft screens.
 *
 * The fleet itself comes from the API through `@/hooks/aircraft`, and the
 * table's search, filters and paging live in the URL via
 * `useAircraftTableParams`. What is left here is what the server does not own
 * and a link would not carry: which dialog is open, on which row, and which
 * detail tab is showing.
 *
 * The data array, its filtering and its pagination getters were deleted when
 * this module graduated — see the data-layer section of `Frontend/AGENTS.md`.
 */
export const useAircraftStore = create((set) => ({
  activeTab: "overview",

  addModalOpen: false,
  editingAircraft: null,

  /** Named "archive", not "delete": nothing in this system is destroyed. */
  archiveModalOpen: false,
  /** Held whole, not by id: the row must stay nameable in the confirmation
   *  dialog even after the list refetches and drops it. */
  archivingAircraft: null,

  /** Covers all four statuses, not just the maintenance toggle it began as. */
  statusModalOpen: false,
  statusTargetAircraft: null,

  setActiveTab: (activeTab) => set({ activeTab }),

  openAddModal: () => set({ addModalOpen: true, editingAircraft: null }),
  openEditModal: (aircraft) => set({ addModalOpen: true, editingAircraft: aircraft }),
  closeAddModal: () => set({ addModalOpen: false, editingAircraft: null }),

  openArchiveModal: (aircraft) =>
    set({ archiveModalOpen: true, archivingAircraft: aircraft }),
  closeArchiveModal: () => set({ archiveModalOpen: false, archivingAircraft: null }),

  openStatusModal: (aircraft) =>
    set({ statusModalOpen: true, statusTargetAircraft: aircraft }),
  closeStatusModal: () =>
    set({ statusModalOpen: false, statusTargetAircraft: null }),
}));
