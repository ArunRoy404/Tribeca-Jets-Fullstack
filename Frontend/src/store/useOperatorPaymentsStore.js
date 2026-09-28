import { create } from "zustand";

/**
 * Client-only state for the Operator Payments board: which dialog is open and
 * what it is working on. The bills come from `@/hooks/operator-payments`, and
 * the filters, page and open sheet live in the URL.
 *
 * `draft` pre-fills a new bill — the trip page's "Record operator bill" hands
 * over its trip. `payment` is the payment being corrected; null means a new one.
 */
export const useOperatorPaymentsStore = create((set) => ({
  billModalOpen: false,
  editingBill: null,
  draft: null,

  paymentModalOpen: false,
  paymentBill: null,
  editingPayment: null,

  openAddModal: (draft = null) => set({ billModalOpen: true, editingBill: null, draft }),
  openEditModal: (bill) => set({ billModalOpen: true, editingBill: bill, draft: null }),
  closeBillModal: () => set({ billModalOpen: false, editingBill: null, draft: null }),

  openPaymentModal: (bill, payment = null) => set({ paymentModalOpen: true, paymentBill: bill, editingPayment: payment }),
  closePaymentModal: () => set({ paymentModalOpen: false, paymentBill: null, editingPayment: null }),
}));
