import { create } from "zustand";
import { transactionsData, transactionsStats } from "@/dummyData/transactions";

export const TRANSACTIONS_PAGE_SIZE = 5;

function normalizeId(id) {
  return String(id ?? "").replace("#", "").toUpperCase();
}

export const useTransactionsStore = create((set, get) => ({
  transactions: transactionsData,
  stats: transactionsStats,
  search: "",
  statusFilter: "All Status",
  page: 1,

  selectedTransactionId: null,
  recordPaymentModalOpen: false,
  recordPaymentTargetId: null,
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

  getFilteredTransactions: () => {
    const { transactions, search, statusFilter } = get();
    const query = (search ?? "").trim().toLowerCase();
    return transactions?.filter((item) => {
      if (statusFilter !== "All Status" && item?.status !== statusFilter) return false;
      if (
        query &&
        !`${item?.id} ${item?.reference} ${item?.client} ${item?.tripId} ${item?.type} ${item?.broker}`
          .toLowerCase()
          .includes(query)
      ) {
        return false;
      }
      return true;
    });
  },

  getPageCount: () => {
    const filtered = get()?.getFilteredTransactions?.();
    return Math.max(1, Math.ceil((filtered?.length ?? 0) / TRANSACTIONS_PAGE_SIZE));
  },

  getFilteredCount: () => {
    const filtered = get()?.getFilteredTransactions?.();
    return filtered?.length ?? 0;
  },

  getPageTransactions: () => {
    const { page } = get();
    const filtered = get()?.getFilteredTransactions?.();
    const start = (page - 1) * TRANSACTIONS_PAGE_SIZE;
    return filtered?.slice(start, start + TRANSACTIONS_PAGE_SIZE);
  },

  getTransactionById: (id) => {
    if (!id) return null;
    const normalized = normalizeId(id);
    return (
      get()?.transactions?.find(
        (item) => normalizeId(item?.id) === normalized || normalizeId(item?.reference) === normalized
      ) ?? null
    );
  },

  selectTransaction: (id) => set({ selectedTransactionId: id }),
  closeTransactionDetail: () => set({ selectedTransactionId: null }),

  openRecordPaymentModal: (id) => set({ recordPaymentModalOpen: true, recordPaymentTargetId: id }),
  closeRecordPaymentModal: () => set({ recordPaymentModalOpen: false, recordPaymentTargetId: null }),

  openDeleteModal: (id) => set({ deleteModalOpen: true, deleteTargetId: id }),
  closeDeleteModal: () => set({ deleteModalOpen: false, deleteTargetId: null }),

  recordPayment: (id, paymentData) =>
    set((state) => {
      const target = state?.transactions?.find((item) => normalizeId(item?.id) === normalizeId(id));
      if (!target) return state;

      const newPayment = Number(paymentData?.amountRaw || 0);
      const newPaid = (target?.paidRaw || 0) + newPayment;
      const totalAmount = (target?.amountRaw || 0) + (target?.fetRaw || 0);
      const newBalance = Math.max(0, totalAmount - newPaid);

      let newStatus = target?.status;
      if (newBalance === 0) {
        newStatus = "Paid";
      } else if (newPaid > 0) {
        newStatus = "Partially Paid";
      }

      return {
        transactions: state?.transactions?.map((item) =>
          normalizeId(item?.id) === normalizeId(id)
            ? {
                ...item,
                paidRaw: newPaid,
                balanceRaw: newBalance,
                balance: `$${newBalance.toLocaleString()}`,
                status: newStatus,
                dated: paymentData?.date || item?.dated,
                method: paymentData?.method || item?.method,
              }
            : item
        ),
        recordPaymentModalOpen: false,
        recordPaymentTargetId: null,
      };
    }),

  deleteTransaction: (id) =>
    set((state) => ({
      transactions: state?.transactions?.filter(
        (item) => normalizeId(item?.id) !== normalizeId(id) && normalizeId(item?.reference) !== normalizeId(id)
      ),
      deleteModalOpen: false,
      deleteTargetId: null,
      selectedTransactionId: state?.selectedTransactionId === id ? null : state?.selectedTransactionId,
    })),
}));
