import { create } from "zustand";
import { operatorsData } from "@/dummyData/operators";

export const OPERATORS_PAGE_SIZE = 6;

function normalizeId(id) {
  return String(id ?? "").replace("#", "").toUpperCase();
}

export const useOperatorsStore = create((set, get) => ({
  operators: operatorsData,
  search: "",
  statusFilter: "All",
  page: 1,

  activeTab: "overview",

  addModalOpen: false,
  editingOperator: null,
  quoteModalOpen: false,
  quoteTargetOperator: null,

  setSearch: (search) => set({ search, page: 1 }),
  setStatusFilter: (statusFilter) => set({ statusFilter, page: 1 }),
  clearFilters: () => set({ search: "", statusFilter: "All", page: 1 }),

  nextPage: () => {
    const count = get()?.getPageCount?.();
    set((state) => ({ page: Math.min(state?.page + 1, count) }));
  },
  prevPage: () => set((state) => ({ page: Math.max(state?.page - 1, 1) })),

  setActiveTab: (activeTab) => set({ activeTab }),

  openAddModal: () => set({ addModalOpen: true, editingOperator: null }),
  openEditModal: (operator) => set({ addModalOpen: true, editingOperator: operator }),
  closeAddModal: () => set({ addModalOpen: false, editingOperator: null }),

  openQuoteModal: (operator) => set({ quoteModalOpen: true, quoteTargetOperator: operator }),
  closeQuoteModal: () => set({ quoteModalOpen: false, quoteTargetOperator: null }),

  addOperator: (newOp) =>
    set((state) => {
      const id = `OP-${1000 + (state?.operators?.length ?? 0) + 1}`;
      const operator = {
        id,
        reliability: 4.8,
        totalTrips: 0,
        totalPaid: "$0",
        safety: "ARG/US Platinum",
        responseSpeed: "< 15 min",
        fleet: [],
        tripHistory: [],
        payments: [],
        serviceRoutes: [],
        paymentTerms: "Net 30",
        ...newOp,
      };
      return { operators: [operator, ...(state?.operators ?? [])] };
    }),

  updateOperator: (id, updates) =>
    set((state) => ({
      operators: state?.operators?.map((op) =>
        normalizeId(op?.id) === normalizeId(id) ? { ...op, ...updates } : op
      ),
    })),

  deleteOperator: (id) =>
    set((state) => ({
      operators: state?.operators?.filter((op) => normalizeId(op?.id) !== normalizeId(id)),
    })),

  getOperatorById: (id) => {
    if (!id) return null;
    const target = normalizeId(id);
    return get()?.operators?.find((op) => normalizeId(op?.id) === target) || null;
  },

  getFilteredOperators: () => {
    const { operators, search, statusFilter } = get();
    return operators?.filter((op) => {
      if (statusFilter !== "All" && op?.status?.toLowerCase() !== statusFilter?.toLowerCase()) {
        return false;
      }
      if ((search ?? "").trim()) {
        const q = search.toLowerCase();
        const matchesName = op?.name?.toLowerCase()?.includes(q);
        const matchesBase = op?.homeBase?.toLowerCase()?.includes(q);
        const matchesContact = op?.primaryContact?.toLowerCase()?.includes(q);
        const matchesTypes = op?.aircraftTypes?.some((t) => t?.toLowerCase()?.includes(q));
        if (!matchesName && !matchesBase && !matchesContact && !matchesTypes) {
          return false;
        }
      }
      return true;
    });
  },

  getPageCount: () => {
    const filtered = get()?.getFilteredOperators?.();
    return Math.max(1, Math.ceil((filtered?.length ?? 0) / OPERATORS_PAGE_SIZE));
  },

  getFilteredCount: () => {
    const filtered = get()?.getFilteredOperators?.();
    return filtered?.length ?? 0;
  },

  getPageOperators: () => {
    const { page } = get();
    const filtered = get()?.getFilteredOperators?.();
    const start = (page - 1) * OPERATORS_PAGE_SIZE;
    return filtered?.slice(start, start + OPERATORS_PAGE_SIZE);
  },
}));
