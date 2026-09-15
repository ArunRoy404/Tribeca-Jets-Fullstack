import { create } from "zustand";
import { flightsData, flightTrackingStats } from "@/dummyData/flightTracking";

export const FLIGHT_TRACKING_PAGE_SIZE = 5;

function normalizeId(id) {
  return String(id).replace("#", "").toUpperCase();
}

export const useFlightTrackingStore = create((set, get) => ({
  flights: flightsData,
  stats: flightTrackingStats,
  search: "",
  statusFilter: "All",
  page: 1,

  selectedFlightId: null,

  setSearch: (search) => set({ search, page: 1 }),
  setStatusFilter: (statusFilter) => set({ statusFilter, page: 1 }),
  clearFilters: () => set({ search: "", statusFilter: "All", page: 1 }),
  
  nextPage: () => set((state) => ({ page: Math.min(state.page + 1, getPageCount(get())) })),
  prevPage: () => set((state) => ({ page: Math.max(state.page - 1, 1) })),

  getFilteredFlights: () => {
    const { flights, search, statusFilter } = get();
    const query = search.trim().toLowerCase();
    return flights.filter((f) => {
      if (statusFilter !== "All" && f.flightStatus !== statusFilter) return false;
      if (
        query &&
        !`${f.id} ${f.client} ${f.tailNumber} ${f.aircraft} ${f.operator} ${f.origin} ${f.destination}`
          .toLowerCase()
          .includes(query)
      ) {
        return false;
      }
      return true;
    });
  },

  getFlightById: (id) => {
    if (!id) return null;
    const normalized = normalizeId(id);
    return get().flights.find((f) => normalizeId(f.id) === normalized || normalizeId(f.tripId) === normalized) ?? null;
  },

  selectFlight: (id) => set({ selectedFlightId: id }),
  closeFlightDetail: () => set({ selectedFlightId: null }),

  addFlightUpdate: (flightId, updateText) =>
    set((state) => ({
      flights: state.flights.map((f) =>
        normalizeId(f.id) === normalizeId(flightId)
          ? {
              ...f,
              updates: [
                { text: updateText, time: "Just now" },
                ...(f.updates || []),
              ],
            }
          : f
      ),
    })),
}));

function getPageCount(state) {
  const filtered = state.getFilteredFlights();
  return Math.max(1, Math.ceil(filtered.length / FLIGHT_TRACKING_PAGE_SIZE));
}
