import { create } from "zustand";

/**
 * Schedule (#13) keeps only client state here: which leg's detail panel is
 * open. The legs themselves come from the API through `@/hooks/schedule`, and
 * the view, the day and the filters live in the URL.
 */
export const useScheduleStore = create((set) => ({
  selectedEventId: null,
  selectEvent: (eventId) => set({ selectedEventId: eventId }),
  closeEventDetail: () => set({ selectedEventId: null }),
}));
