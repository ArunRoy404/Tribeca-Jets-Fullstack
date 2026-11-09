import { create } from "zustand";

/**
 * Global store to trigger the Booking Confirmation Modal with celebratory
 * animation and client invoice reminder (Batch 3 - CRM Feedback 1.2).
 */
export const useBookingConfirmationStore = create((set) => ({
  isOpen: false,
  trip: null,
  openModal: (trip) => set({ isOpen: true, trip }),
  closeModal: () => set({ isOpen: false, trip: null }),
}));
