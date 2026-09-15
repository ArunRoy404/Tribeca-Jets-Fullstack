import { create } from "zustand";
import { operatorPaymentsData, operatorPaymentsStats } from "@/dummyData/operatorPayments";

export const OPERATOR_PAYMENTS_PAGE_SIZE = 5;

function normalizeId(id) {
  return String(id ?? "").replace("#", "").toUpperCase();
}

export const useOperatorPaymentsStore = create((set, get) => ({
  operatorPayments: operatorPaymentsData,
  stats: operatorPaymentsStats,
  search: "",
  statusFilter: "All Status",
  page: 1,

  selectedPaymentId: null,
  addModalOpen: false,
  editingPayment: null,
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

  getFilteredOperatorPayments: () => {
    const { operatorPayments, search, statusFilter } = get();
    const query = (search ?? "").trim().toLowerCase();
    return operatorPayments?.filter((item) => {
      if (statusFilter !== "All Status" && item?.status !== statusFilter) return false;
      if (
        query &&
        !`${item?.id} ${item?.operator} ${item?.tripId} ${item?.broker}`
          .toLowerCase()
          .includes(query)
      ) {
        return false;
      }
      return true;
    });
  },

  getPageCount: () => {
    const filtered = get()?.getFilteredOperatorPayments?.();
    return Math.max(1, Math.ceil((filtered?.length ?? 0) / OPERATOR_PAYMENTS_PAGE_SIZE));
  },

  getFilteredCount: () => {
    const filtered = get()?.getFilteredOperatorPayments?.();
    return filtered?.length ?? 0;
  },

  getPageOperatorPayments: () => {
    const { page } = get();
    const filtered = get()?.getFilteredOperatorPayments?.();
    const start = (page - 1) * OPERATOR_PAYMENTS_PAGE_SIZE;
    return filtered?.slice(start, start + OPERATOR_PAYMENTS_PAGE_SIZE);
  },

  getPaymentById: (id) => {
    if (!id) return null;
    const normalized = normalizeId(id);
    return get()?.operatorPayments?.find((item) => normalizeId(item?.id) === normalized) ?? null;
  },

  selectPayment: (id) => set({ selectedPaymentId: id }),
  closePaymentDetail: () => set({ selectedPaymentId: null }),

  openAddModal: () => set({ addModalOpen: true, editingPayment: null }),
  openEditModal: (payment) => set({ addModalOpen: true, editingPayment: payment }),
  closeAddModal: () => set({ addModalOpen: false, editingPayment: null }),

  openDeleteModal: (id) => set({ deleteModalOpen: true, deleteTargetId: id }),
  closeDeleteModal: () => set({ deleteModalOpen: false, deleteTargetId: null }),

  openRecordPaymentModal: (id) => set({ recordPaymentModalOpen: true, recordPaymentTargetId: id }),
  closeRecordPaymentModal: () => set({ recordPaymentModalOpen: false, recordPaymentTargetId: null }),

  addOperatorPayment: (data) =>
    set((state) => {
      const amountRaw = Number(data?.amountRaw || 0);
      const paidRaw = 0;
      const balanceRaw = amountRaw;

      return {
        operatorPayments: [
          {
            id: `OP-2026-${Math.floor(100 + Math.random() * 500)}`,
            status: data?.status || "Pending",
            due: data?.due || "Aug 20, 2026",
            paid: "$0",
            paidRaw: 0,
            balanceRaw,
            balance: `$${balanceRaw.toLocaleString()}`,
            amount: `$${amountRaw.toLocaleString()}`,
            amountRaw,
            ...data,
          },
          ...(state?.operatorPayments ?? []),
        ],
        addModalOpen: false,
        editingPayment: null,
      };
    }),

  updateOperatorPayment: (id, data) =>
    set((state) => ({
      operatorPayments: state?.operatorPayments?.map((item) => {
        if (normalizeId(item?.id) !== normalizeId(id)) return item;

        const amountRaw = data?.amountRaw !== undefined ? Number(data?.amountRaw) : item?.amountRaw;
        const paidRaw = data?.paidRaw !== undefined ? Number(data?.paidRaw) : item?.paidRaw;
        const balanceRaw = amountRaw - paidRaw;

        return {
          ...item,
          ...data,
          amountRaw,
          paidRaw,
          balanceRaw,
          amount: `$${amountRaw.toLocaleString()}`,
          paid: `$${paidRaw.toLocaleString()}`,
          balance: `$${balanceRaw.toLocaleString()}`,
        };
      }),
      addModalOpen: false,
      editingPayment: null,
    })),

  deleteOperatorPayment: (id) =>
    set((state) => ({
      operatorPayments: state?.operatorPayments?.filter((item) => normalizeId(item?.id) !== normalizeId(id)),
      deleteModalOpen: false,
      deleteTargetId: null,
      selectedPaymentId: state?.selectedPaymentId === id ? null : state?.selectedPaymentId,
    })),

  recordPayment: (id, paymentData) =>
    set((state) => ({
      operatorPayments: state?.operatorPayments?.map((item) => {
        if (normalizeId(item?.id) !== normalizeId(id)) return item;
        const addPaid = Number(paymentData?.amountRaw || paymentData?.amount || 0);
        const newPaidRaw = (item?.paidRaw || 0) + addPaid;
        const totalAmount = item?.amountRaw || 0;
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
