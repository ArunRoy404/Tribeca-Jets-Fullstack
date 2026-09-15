import { create } from "zustand";
import { trips, tripsStats } from "@/dummyData/trips";

export const TRIPS_PAGE_SIZE = 6;
const PAGE_SIZE = TRIPS_PAGE_SIZE;

export const useTripsStore = create((set, get) => ({
  trips,
  stats: tripsStats,
  search: "",
  statusFilter: "All",
  brokerFilter: "All",
  paymentFilter: "All",
  page: 1,

  setSearch: (search) => set({ search, page: 1 }),
  setStatusFilter: (statusFilter) => set({ statusFilter, page: 1 }),
  setBrokerFilter: (brokerFilter) => set({ brokerFilter, page: 1 }),
  setPaymentFilter: (paymentFilter) => set({ paymentFilter, page: 1 }),
  clearFilters: () => set({ search: "", statusFilter: "All", brokerFilter: "All", paymentFilter: "All", page: 1 }),
  nextPage: () =>
    set((state) => ({ page: Math.min(state?.page + 1, state?.getPageCount?.()) })),
  prevPage: () => set((state) => ({ page: Math.max(state?.page - 1, 1) })),

  getFilteredTrips: () => {
    const { trips, search, statusFilter, brokerFilter, paymentFilter } = get();
    const query = (search ?? "").trim().toLowerCase();
    return trips?.filter((trip) => {
      if (statusFilter !== "All" && trip?.status !== statusFilter) return false;
      if (brokerFilter !== "All" && trip?.broker !== brokerFilter) return false;
      if (paymentFilter !== "All" && trip?.clientPmt !== paymentFilter) return false;
      if (
        query &&
        !`${trip?.id} ${trip?.client} ${trip?.broker} ${trip?.aircraft} ${trip?.operator}`
          .toLowerCase()
          .includes(query)
      )
        return false;
      return true;
    });
  },

  getPageCount: () => {
    const filtered = get()?.getFilteredTrips?.();
    return Math.max(1, Math.ceil((filtered?.length ?? 0) / PAGE_SIZE));
  },

  getFilteredCount: () => {
    const filtered = get()?.getFilteredTrips?.();
    return filtered?.length ?? 0;
  },

  getPageTrips: () => {
    const { page } = get();
    const filtered = get()?.getFilteredTrips?.();
    const start = (page - 1) * PAGE_SIZE;
    return filtered?.slice(start, start + PAGE_SIZE);
  },
}));
