import { create } from "zustand";

/**
 * Client-only state for the Airports screen.
 *
 * The airports themselves come from the API through `@/hooks/airports`, and
 * the table's search, country filter and paging live in the URL via
 * `useAirportsTableParams`. What is left here is what the server does not own
 * and a link would not carry: which dialog is open, and on which row.
 *
 * The data array, its filtering and its pagination getters were deleted when
 * this module graduated — see the data-layer section of `Frontend/AGENTS.md`.
 */
export const useAirportsStore = create((set) => ({
  addModalOpen: false,
  editingAirport: null,
  deleteModalOpen: false,
  deletingAirport: null,
  detailsSidebarOpen: false,
  selectedAirport: null,

  openAddModal: () => set({ addModalOpen: true, editingAirport: null }),
  openEditModal: (airport) => set({ addModalOpen: true, editingAirport: airport }),
  closeAddModal: () => set({ addModalOpen: false, editingAirport: null }),

  openDeleteModal: (airport) => set({ deleteModalOpen: true, deletingAirport: airport }),
  closeDeleteModal: () => set({ deleteModalOpen: false, deletingAirport: null }),

  openDetailsSidebar: (airport) => set({ detailsSidebarOpen: true, selectedAirport: airport }),
  closeDetailsSidebar: () => set({ detailsSidebarOpen: false, selectedAirport: null }),
}));
