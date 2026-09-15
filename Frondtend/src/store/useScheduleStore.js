import { create } from "zustand";
import { scheduleEvents, scheduleStats, REFERENCE_TODAY } from "@/dummyData/schedule";
import { addDays, addMonths, isSameDay, toISODate, parseLocalDate } from "@/lib/date";

export const useScheduleStore = create((set, get) => ({
  events: scheduleEvents,
  stats: scheduleStats,
  view: "Today",
  currentDate: parseLocalDate(REFERENCE_TODAY),
  search: "",
  statusFilter: "All",
  brokerFilter: "All",
  operatorFilter: "All",
  aircraftFilter: "All",
  tripTypeFilter: "All",
  selectedEventId: null,

  setView: (view) => set({ view }),
  setSearch: (search) => set({ search }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setBrokerFilter: (brokerFilter) => set({ brokerFilter }),
  setOperatorFilter: (operatorFilter) => set({ operatorFilter }),
  setAircraftFilter: (aircraftFilter) => set({ aircraftFilter }),
  setTripTypeFilter: (tripTypeFilter) => set({ tripTypeFilter }),
  clearFilters: () =>
    set({
      search: "",
      statusFilter: "All",
      brokerFilter: "All",
      operatorFilter: "All",
      aircraftFilter: "All",
      tripTypeFilter: "All",
    }),
  goToday: () => set({ currentDate: parseLocalDate(REFERENCE_TODAY) }),
  goToDate: (date) => set({ currentDate: date }),
  goPrev: () =>
    set((state) => ({
      currentDate:
        state.view === "This Month"
          ? addMonths(state.currentDate, -1)
          : addDays(state.currentDate, state.view === "This Week" ? -7 : -1),
    })),
  goNext: () =>
    set((state) => ({
      currentDate:
        state.view === "This Month"
          ? addMonths(state.currentDate, 1)
          : addDays(state.currentDate, state.view === "This Week" ? 7 : 1),
    })),

  selectEvent: (eventId) => set({ selectedEventId: eventId }),
  closeEventDetail: () => set({ selectedEventId: null }),

  getFilteredEvents: () => {
    const { events, search, statusFilter, brokerFilter, operatorFilter, aircraftFilter, tripTypeFilter } = get();
    const query = search.trim().toLowerCase();
    return events.filter((event) => {
      if (statusFilter !== "All" && event.status !== statusFilter) return false;
      if (brokerFilter !== "All" && event.broker !== brokerFilter) return false;
      if (operatorFilter !== "All" && event.operator !== operatorFilter) return false;
      if (aircraftFilter !== "All" && event.aircraft !== aircraftFilter) return false;
      if (tripTypeFilter !== "All" && event.tripType !== tripTypeFilter) return false;
      if (query && !`${event.id} ${event.client} ${event.aircraft} ${event.operator}`.toLowerCase().includes(query))
        return false;
      return true;
    });
  },

  getEventsForDate: (date) => {
    const iso = toISODate(date);
    return get()
      .getFilteredEvents()
      .filter((event) => event.date === iso)
      .sort((a, b) => a.time.localeCompare(b.time));
  },

  getEventsForMonth: (year, month) => {
    return get()
      .getFilteredEvents()
      .filter((event) => {
        const d = parseLocalDate(event.date);
        return d.getFullYear() === year && d.getMonth() === month;
      });
  },

  getEventById: (eventId) => get().events.find((event) => event.id === eventId) ?? null,
}));

export { isSameDay };
