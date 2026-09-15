import { create } from "zustand";
import { sourcingRequests, operatorSourcingStats } from "@/dummyData/operatorSourcing";

export const SOURCING_PAGE_SIZE = 5;
const PAGE_SIZE = SOURCING_PAGE_SIZE;

function normalizeId(id) {
  return String(id ?? "").replace("#", "").toUpperCase();
}

export const useOperatorSourcingStore = create((set, get) => ({
  requests: sourcingRequests,
  stats: operatorSourcingStats,
  search: "",
  statusFilter: "All",
  brokerFilter: "All",
  paymentFilter: "All",
  page: 1,

  selectedRequestId: null,
  newRequestOpen: false,
  quoteRequestId: null,

  setSearch: (search) => set({ search, page: 1 }),
  setStatusFilter: (statusFilter) => set({ statusFilter, page: 1 }),
  setBrokerFilter: (brokerFilter) => set({ brokerFilter, page: 1 }),
  setPaymentFilter: (paymentFilter) => set({ paymentFilter, page: 1 }),
  clearFilters: () => set({ search: "", statusFilter: "All", brokerFilter: "All", paymentFilter: "All", page: 1 }),

  nextPage: () => {
    const count = get()?.getPageCount?.();
    set((state) => ({ page: Math.min(state?.page + 1, count) }));
  },
  prevPage: () => set((state) => ({ page: Math.max(state?.page - 1, 1) })),

  getFilteredRequests: () => {
    const { requests, search, statusFilter, brokerFilter, paymentFilter } = get();
    const query = (search ?? "").trim().toLowerCase();
    return requests?.filter((r) => {
      if (statusFilter !== "All" && r?.status !== statusFilter) return false;
      if (brokerFilter !== "All" && r?.broker !== brokerFilter) return false;
      if (paymentFilter !== "All" && r?.depositStatus !== paymentFilter) return false;
      if (query && !`${r?.id} ${r?.client} ${r?.aircraftNeeded}`.toLowerCase().includes(query)) return false;
      return true;
    });
  },

  getPageCount: () => {
    const filtered = get()?.getFilteredRequests?.();
    return Math.max(1, Math.ceil((filtered?.length ?? 0) / PAGE_SIZE));
  },

  getFilteredCount: () => {
    const filtered = get()?.getFilteredRequests?.();
    return filtered?.length ?? 0;
  },

  getPageRequests: () => {
    const { page } = get();
    const filtered = get()?.getFilteredRequests?.();
    const start = (page - 1) * PAGE_SIZE;
    return filtered?.slice(start, start + PAGE_SIZE);
  },

  getRequestById: (id) => {
    if (!id) return null;
    const normalized = normalizeId(id);
    return get()?.requests?.find((r) => normalizeId(r?.id) === normalized) ?? null;
  },

  selectRequest: (id) => set({ selectedRequestId: id }),
  closeRequestDetail: () => set({ selectedRequestId: null }),

  openNewRequest: () => set({ newRequestOpen: true }),
  closeNewRequest: () => set({ newRequestOpen: false }),

  openQuoteRequest: (id) => set({ quoteRequestId: id }),
  closeQuoteRequest: () => set({ quoteRequestId: null }),

  addRequest: (data) =>
    set((state) => ({
      requests: [
        {
          id: `TJ-${Math.floor(2500 + Math.random() * 500)}`,
          operatorsContacted: 0,
          responses: 0,
          status: "Requested",
          depositStatus: "Pending",
          quotes: [],
          ...data,
        },
        ...(state?.requests ?? []),
      ],
    })),

  addQuote: (requestId, quote) =>
    set((state) => ({
      requests: state?.requests?.map((r) =>
        normalizeId(r?.id) === normalizeId(requestId)
          ? {
              ...r,
              operatorsContacted: (r?.operatorsContacted ?? 0) + 1,
              quotes: [...(r?.quotes ?? []), { id: `q${(r?.quotes?.length ?? 0) + 1}`, status: "Pending", ...quote }],
            }
          : r
      ),
    })),

  setQuoteStatus: (requestId, quoteId, status) =>
    set((state) => ({
      requests: state?.requests?.map((r) =>
        normalizeId(r?.id) === normalizeId(requestId)
          ? { ...r, quotes: (r?.quotes ?? [])?.map((q) => (q?.id === quoteId ? { ...q, status } : q)) }
          : r
      ),
    })),
}));
