import { create } from "zustand";

/**
 * Client-only state for the Itineraries board (#12).
 *
 * The documents themselves come from the API through `@/hooks/itineraries`;
 * the filters, page and open detail sheet live in the URL
 * (`useItinerariesTableParams`). What is left is which dialog is open and the
 * raw record it is editing or sending — nothing the server owns.
 */
export const useItinerariesStore = create((set) => ({
  buildModalOpen: false,
  editingItinerary: null,

  sendModalOpen: false,
  sendTargetId: null,

  openBuildModal: () => set({ buildModalOpen: true, editingItinerary: null }),
  openEditModal: (itinerary) => set({ buildModalOpen: true, editingItinerary: itinerary }),
  closeBuildModal: () => set({ buildModalOpen: false, editingItinerary: null }),

  openSendModal: (id) => set({ sendModalOpen: true, sendTargetId: id }),
  closeSendModal: () => set({ sendModalOpen: false, sendTargetId: null }),
}));
