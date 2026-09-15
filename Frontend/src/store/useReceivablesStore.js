import { create } from "zustand";
import { receivablesData, receivablesStats } from "@/dummyData/receivables";

export const RECEIVABLES_PAGE_SIZE = 5;

function normalizeId(id) {
  return String(id ?? "").replace("#", "").toUpperCase();
}

export const useReceivablesStore = create((set, get) => ({
  receivables: receivablesData,
  stats: receivablesStats,
  search: "",
  statusFilter: "All Status",
  page: 1,

  selectedReceivableId: null,
  addModalOpen: false,
  editingReceivable: null,
  deleteModalOpen: false,
  deleteTargetId: null,
  recordPaymentModalOpen: false,
  recordPaymentTargetId: null,

  setSearch: (search) => set({ search, page: 1 }),
  setStatusFilter: (statusFilter) => set({ statusFilter, page: 1 }),
  clearFilters: () => set({ search: "", statusFilter: "All Status", page: 1 }),

  nextPage: () => {
    const count = get()?.getPageCount?.();
    set((state) => ({ page: Math.min(state?.page + 1, count) }));
  },
  prevPage: () => set((state) => ({ page: Math.max(state?.page - 1, 1) })),

  getFilteredReceivables: () => {
    const { receivables, search, statusFilter } = get();
    const query = (search ?? "").trim().toLowerCase();
    return receivables?.filter((item) => {
      if (statusFilter !== "All Status" && item?.status !== statusFilter) return false;
      if (
        query &&
        !`${item?.id} ${item?.client} ${item?.tripId} ${item?.invoice} ${item?.broker}`
          .toLowerCase()
          .includes(query)
      ) {
        return false;
      }
      return true;
    });
  },

  getPageCount: () => {
    const filtered = get()?.getFilteredReceivables?.();
    return Math.max(1, Math.ceil((filtered?.length ?? 0) / RECEIVABLES_PAGE_SIZE));
  },

  getFilteredCount: () => {
    const filtered = get()?.getFilteredReceivables?.();
    return filtered?.length ?? 0;
  },

  getPageReceivables: () => {
    const { page } = get();
    const filtered = get()?.getFilteredReceivables?.();
    const start = (page - 1) * RECEIVABLES_PAGE_SIZE;
    return filtered?.slice(start, start + RECEIVABLES_PAGE_SIZE);
  },

  getReceivableById: (id) => {
    if (!id) return null;
    const normalized = normalizeId(id);
    return get()?.receivables?.find((item) => normalizeId(item?.id) === normalized) ?? null;
  },

  selectReceivable: (id) => set({ selectedReceivableId: id }),
  closeReceivableDetail: () => set({ selectedReceivableId: null }),

  openAddModal: () => set({ addModalOpen: true, editingReceivable: null }),
  openEditModal: (receivable) => set({ addModalOpen: true, editingReceivable: receivable }),
  closeAddModal: () => set({ addModalOpen: false, editingReceivable: null }),

  openDeleteModal: (id) => set({ deleteModalOpen: true, deleteTargetId: id }),
  closeDeleteModal: () => set({ deleteModalOpen: false, deleteTargetId: null }),

  openRecordPaymentModal: (id) => set({ recordPaymentModalOpen: true, recordPaymentTargetId: id }),
  closeRecordPaymentModal: () => set({ recordPaymentModalOpen: false, recordPaymentTargetId: null }),

  addReceivable: (data) =>
    set((state) => {
      const amountRaw = Number(data?.amountRaw || 0);
      const fetRaw = Number(data?.fetRaw || 0);
      const balanceRaw = amountRaw + fetRaw;
      
      return {
        receivables: [
          {
            id: `REC-${Math.floor(1005 + Math.random() * 500)}`,
            status: data?.status || "Due",
            due: data?.due || "Aug 20, 2026",
            paid: "$0",
            paidRaw: 0,
            balanceRaw,
            balance: `$${balanceRaw.toLocaleString()}`,
            amount: `$${amountRaw.toLocaleString()}`,
            fet: `$${fetRaw.toLocaleString()}`,
            ...data,
          },
          ...(state?.receivables ?? []),
        ],
        addModalOpen: false,
        editingReceivable: null,
      };
    }),

  updateReceivable: (id, data) =>
    set((state) => ({
      receivables: state?.receivables?.map((item) => {
        if (normalizeId(item?.id) !== normalizeId(id)) return item;
        
        const amountRaw = data?.amountRaw !== undefined ? Number(data?.amountRaw) : item?.amountRaw;
        const fetRaw = data?.fetRaw !== undefined ? Number(data?.fetRaw) : item?.fetRaw;
        const paidRaw = data?.paidRaw !== undefined ? Number(data?.paidRaw) : item?.paidRaw;
        const balanceRaw = (amountRaw + fetRaw) - paidRaw;

        return {
          ...item,
          ...data,
          amountRaw,
          fetRaw,
          paidRaw,
          balanceRaw,
          amount: `$${amountRaw.toLocaleString()}`,
          fet: `$${fetRaw.toLocaleString()}`,
          paid: `$${paidRaw.toLocaleString()}`,
          balance: `$${balanceRaw.toLocaleString()}`,
        };
      }),
      addModalOpen: false,
      editingReceivable: null,
    })),

  deleteReceivable: (id) =>
    set((state) => ({
      receivables: state?.receivables?.filter((item) => normalizeId(item?.id) !== normalizeId(id)),
      deleteModalOpen: false,
      deleteTargetId: null,
      selectedReceivableId: state?.selectedReceivableId === id ? null : state?.selectedReceivableId,
    })),

  recordPayment: (id, paymentData) =>
    set((state) => ({
      receivables: state?.receivables?.map((item) => {
        if (normalizeId(item?.id) !== normalizeId(id)) return item;
        const addPaid = Number(paymentData?.amountRaw || paymentData?.amount || 0);
        const newPaidRaw = (item?.paidRaw || 0) + addPaid;
        const totalAmount = (item?.amountRaw || 0) + (item?.fetRaw || 0);
        const newBalanceRaw = Math.max(0, totalAmount - newPaidRaw);
        const newStatus = newBalanceRaw === 0 ? "Paid" : newPaidRaw > 0 ? "Partially Paid" : item?.status;
        return {
          ...item,
          paidRaw: newPaidRaw,
          paid: `$${newPaidRaw.toLocaleString()}`,
          balanceRaw: newBalanceRaw,
          balance: `$${newBalanceRaw.toLocaleString()}`,
          status: newStatus,
          method: paymentData?.method || item?.method,
        };
      }),
      recordPaymentModalOpen: false,
      recordPaymentTargetId: null,
    })),
}));
