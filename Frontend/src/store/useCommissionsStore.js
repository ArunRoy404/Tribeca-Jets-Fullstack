import { create } from "zustand";
import { commissionsData, commissionsStats } from "@/dummyData/commissions";

export const COMMISSIONS_PAGE_SIZE = 5;

function normalizeId(id) {
  return String(id ?? "").replace("#", "").toUpperCase();
}

export const useCommissionsStore = create((set, get) => ({
  commissions: commissionsData,
  stats: commissionsStats,
  search: "",
  statusFilter: "All Status",
  page: 1,

  selectedCommissionId: null,
  addModalOpen: false,
  editingCommission: null,
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

  getFilteredCommissions: () => {
    const { commissions, search, statusFilter } = get();
    const query = (search ?? "").trim().toLowerCase();
    return commissions?.filter((item) => {
      if (statusFilter !== "All Status" && item?.status !== statusFilter) return false;
      if (
        query &&
        !`${item?.id} ${item?.recipient} ${item?.tripId} ${item?.broker} ${item?.type}`
          .toLowerCase()
          .includes(query)
      ) {
        return false;
      }
      return true;
    });
  },

  getPageCount: () => {
    const filtered = get()?.getFilteredCommissions?.();
    return Math.max(1, Math.ceil((filtered?.length ?? 0) / COMMISSIONS_PAGE_SIZE));
  },

  getFilteredCount: () => {
    const filtered = get()?.getFilteredCommissions?.();
    return filtered?.length ?? 0;
  },

  getPageCommissions: () => {
    const { page } = get();
    const filtered = get()?.getFilteredCommissions?.();
    const start = (page - 1) * COMMISSIONS_PAGE_SIZE;
    return filtered?.slice(start, start + COMMISSIONS_PAGE_SIZE);
  },

  getCommissionById: (id) => {
    if (!id) return null;
    const normalized = normalizeId(id);
    return get()?.commissions?.find((item) => normalizeId(item?.id) === normalized) ?? null;
  },

  selectCommission: (id) => set({ selectedCommissionId: id }),
  closeCommissionDetail: () => set({ selectedCommissionId: null }),

  openAddModal: () => set({ addModalOpen: true, editingCommission: null }),
  openEditModal: (commission) => set({ addModalOpen: true, editingCommission: commission }),
  closeAddModal: () => set({ addModalOpen: false, editingCommission: null }),

  openDeleteModal: (id) => set({ deleteModalOpen: true, deleteTargetId: id }),
  closeDeleteModal: () => set({ deleteModalOpen: false, deleteTargetId: null }),

  addCommission: (data) =>
    set((state) => {
      const amountRaw = Number(data?.amountRaw || 0);

      return {
        commissions: [
          {
            id: `COM-${Math.floor(1005 + Math.random() * 500)}`,
            status: data?.status || "Paid",
            dated: data?.dated || "Aug 20, 2026",
            amount: `$${amountRaw.toLocaleString()}`,
            amountRaw,
            type: data?.recipientType === "manual" ? "Manual" : "CRM Client",
            recipient: data?.recipient || data?.recipientName || "Sophia Morgan",
            ...data,
          },
          ...(state?.commissions ?? []),
        ],
        addModalOpen: false,
        editingCommission: null,
      };
    }),

  updateCommission: (id, data) =>
    set((state) => ({
      commissions: state?.commissions?.map((item) => {
        if (normalizeId(item?.id) !== normalizeId(id)) return item;

        const amountRaw = data?.amountRaw !== undefined ? Number(data?.amountRaw) : item?.amountRaw;

        return {
          ...item,
          ...data,
          amountRaw,
          amount: `$${amountRaw.toLocaleString()}`,
          recipient: data?.recipient || data?.recipientName || item?.recipient,
        };
      }),
      addModalOpen: false,
      editingCommission: null,
    })),

  deleteCommission: (id) =>
    set((state) => ({
      commissions: state?.commissions?.filter((item) => normalizeId(item?.id) !== normalizeId(id)),
      deleteModalOpen: false,
      deleteTargetId: null,
      selectedCommissionId: state?.selectedCommissionId === id ? null : state?.selectedCommissionId,
    })),
}));
