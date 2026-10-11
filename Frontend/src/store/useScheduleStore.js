import { create } from "zustand";

/**
 * Schedule (#13) keeps only client state here: which leg's detail panel is
 * open. The legs themselves come from the API through `@/hooks/schedule`, and
 * the view, the day and the filters live in the URL.
 */
export const useScheduleStore = create((set) => ({
  selectedEventId: null,
  selectedDayDate: null,
  selectEvent: (eventId, dayDate = null) =>
    set((state) => ({ selectedEventId: eventId, selectedDayDate: dayDate ?? state.selectedDayDate })),
  closeEventDetail: () => set({ selectedEventId: null, selectedDayDate: null }),
  openDaySchedule: (dayDate) => set({ selectedDayDate: dayDate, selectedEventId: null }),
  backToDayList: () => set({ selectedEventId: null }),
}));
