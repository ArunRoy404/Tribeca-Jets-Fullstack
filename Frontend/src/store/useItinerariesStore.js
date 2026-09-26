import { create } from "zustand";
import { itinerariesData, itinerariesStats } from "@/dummyData/itineraries";

export const ITINERARIES_PAGE_SIZE = 5;

function normalizeId(id) {
  return String(id ?? "").replace("#", "").toUpperCase();
}

export const useItinerariesStore = create((set, get) => ({
  itineraries: itinerariesData,
  stats: itinerariesStats,
  search: "",
  page: 1,

  selectedItineraryId: null,
  buildModalOpen: false,
  sendModalOpen: false,
  sendTargetId: null,

  setSearch: (search) => set({ search, page: 1 }),
  clearFilters: () => set({ search: "", page: 1 }),

  nextPage: () => {
    const count = get()?.getPageCount?.();
    set((state) => ({ page: Math.min(state?.page + 1, count) }));
  },
  prevPage: () => set((state) => ({ page: Math.max(state?.page - 1, 1) })),

  getFilteredItineraries: () => {
    const { itineraries, search } = get();
    const query = (search ?? "").trim().toLowerCase();
    return itineraries?.filter((item) => {
      if (
        query &&
        !`${item?.id} ${item?.client} ${item?.tailNumber} ${item?.from} ${item?.to} ${item?.aircraft} ${item?.operator}`
          .toLowerCase()
          .includes(query)
      ) {
        return false;
      }
      return true;
    });
  },

  getPageCount: () => {
    const filtered = get()?.getFilteredItineraries?.();
    return Math.max(1, Math.ceil((filtered?.length ?? 0) / ITINERARIES_PAGE_SIZE));
  },

  getFilteredCount: () => {
    const filtered = get()?.getFilteredItineraries?.();
    return filtered?.length ?? 0;
  },

  getPageItineraries: () => {
    const { page } = get();
    const filtered = get()?.getFilteredItineraries?.();
    const start = (page - 1) * ITINERARIES_PAGE_SIZE;
    return filtered?.slice(start, start + ITINERARIES_PAGE_SIZE);
  },

  getItineraryById: (id) => {
    if (!id) return null;
    const normalized = normalizeId(id);
    return get()?.itineraries?.find((item) => normalizeId(item?.id) === normalized || normalizeId(item?.tripId) === normalized) ?? null;
  },

  selectItinerary: (id) => set({ selectedItineraryId: id }),
  closeItineraryDetail: () => set({ selectedItineraryId: null }),

  openBuildModal: () => set({ buildModalOpen: true }),
  closeBuildModal: () => set({ buildModalOpen: false }),

  openSendModal: (id) => set({ sendModalOpen: true, sendTargetId: id }),
  closeSendModal: () => set({ sendModalOpen: false, sendTargetId: null }),

  addItinerary: (newDoc) =>
    set((state) => ({
      itineraries: [
        {
          id: `#TJ-${Math.floor(2500 + Math.random() * 500)}`,
          tripId: `TJ-${Math.floor(2500 + Math.random() * 500)}`,
          quoteNumber: `TJ-2026-000${(state?.itineraries?.length ?? 0) + 1}`,
          confirmed: "NO",
          tripStatus: "Booked",
          // No tail, aircraft, operator, date or times here: the document
          // renders what the form captured and an em dash for the rest. These
          // used to fill every blank with N1040TJ, a Global 7500 and Flexjet.
          ...newDoc,
        },
        ...(state?.itineraries ?? []),
      ],
      buildModalOpen: false,
    })),

  confirmItinerary: (id) =>
    set((state) => ({
      itineraries: state?.itineraries?.map((item) =>
        normalizeId(item?.id) === normalizeId(id)
          ? { ...item, confirmed: "Yes", tripStatus: "Confirmed" }
          : item
      ),
    })),
}));
