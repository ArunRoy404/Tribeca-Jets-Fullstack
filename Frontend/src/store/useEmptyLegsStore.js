import { create } from "zustand";
import { emptyLegsData, emptyLegsStats } from "@/dummyData/emptyLegs";

export const EMPTY_LEGS_PAGE_SIZE = 5;

function normalizeId(id) {
  return String(id ?? "").replace("#", "").toUpperCase();
}

export const useEmptyLegsStore = create((set, get) => ({
  emptyLegs: emptyLegsData,
  stats: emptyLegsStats,
  search: "",
  statusFilter: "All Status",
  page: 1,

  selectedLegId: null,
  addModalOpen: false,
  editingLeg: null,
  deleteModalOpen: false,
  deleteTargetId: null,

  setSearch: (search) => set({ search, page: 1 }),
  setStatusFilter: (statusFilter) => set({ statusFilter, page: 1 }),
  clearFilters: () => set({ search: "", statusFilter: "All Status", page: 1 }),

  nextPage: () => {
    const count = get()?.getPageCount?.();
    set((state) => ({ page: Math.min(state?.page + 1, count) }));
  },
  prevPage: () => set((state) => ({ page: Math.max(state?.page - 1, 1) })),

  getFilteredEmptyLegs: () => {
    const { emptyLegs, search, statusFilter } = get();
    const query = (search ?? "").trim().toLowerCase();
    return emptyLegs?.filter((item) => {
      if (statusFilter !== "All Status" && item?.status !== statusFilter) return false;
      if (
        query &&
        !`${item?.id} ${item?.origin} ${item?.destination} ${item?.aircraft} ${item?.operator}`
          .toLowerCase()
          .includes(query)
      ) {
        return false;
      }
      return true;
    });
  },

  getPageCount: () => {
    const filtered = get()?.getFilteredEmptyLegs?.();
    return Math.max(1, Math.ceil((filtered?.length ?? 0) / EMPTY_LEGS_PAGE_SIZE));
  },

  getFilteredCount: () => {
    const filtered = get()?.getFilteredEmptyLegs?.();
    return filtered?.length ?? 0;
  },

  getPageEmptyLegs: () => {
    const { page } = get();
    const filtered = get()?.getFilteredEmptyLegs?.();
    const start = (page - 1) * EMPTY_LEGS_PAGE_SIZE;
    return filtered?.slice(start, start + EMPTY_LEGS_PAGE_SIZE);
  },

  getLegById: (id) => {
    if (!id) return null;
    const normalized = normalizeId(id);
    return get()?.emptyLegs?.find((item) => normalizeId(item?.id) === normalized) ?? null;
  },

  selectLeg: (id) => set({ selectedLegId: id }),
  closeLegDetail: () => set({ selectedLegId: null }),

  openAddModal: () => set({ addModalOpen: true, editingLeg: null }),
  openEditModal: (leg) => set({ addModalOpen: true, editingLeg: leg }),
  closeAddModal: () => set({ addModalOpen: false, editingLeg: null }),

  openDeleteModal: (id) => set({ deleteModalOpen: true, deleteTargetId: id }),
  closeDeleteModal: () => set({ deleteModalOpen: false, deleteTargetId: null }),

  addEmptyLeg: (data) =>
    set((state) => ({
      emptyLegs: [
        {
          id: `EL-${Math.floor(1005 + Math.random() * 500)}`,
          matches: 0,
          status: "Available",
          date: data?.date || "Aug 20, 2026",
          expiry: data?.expiry || "Aug 20",
          price: `$${Number(data?.priceRaw || 10000).toLocaleString()}`,
          ...data,
        },
        ...(state?.emptyLegs ?? []),
      ],
      addModalOpen: false,
      editingLeg: null,
    })),

  updateEmptyLeg: (id, data) =>
    set((state) => ({
      emptyLegs: state?.emptyLegs?.map((item) =>
        normalizeId(item?.id) === normalizeId(id)
          ? {
              ...item,
              ...data,
              price: data?.priceRaw ? `$${Number(data?.priceRaw).toLocaleString()}` : item?.price,
            }
          : item
      ),
      addModalOpen: false,
      editingLeg: null,
    })),

  deleteEmptyLeg: (id) =>
    set((state) => ({
      emptyLegs: state?.emptyLegs?.filter((item) => normalizeId(item?.id) !== normalizeId(id)),
      deleteModalOpen: false,
      deleteTargetId: null,
      selectedLegId: state?.selectedLegId === id ? null : state?.selectedLegId,
    })),
}));
