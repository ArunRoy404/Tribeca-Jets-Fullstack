import { create } from "zustand";

/**
 * Client-only state for the Receivables board: which dialog is open and what
 * it is working on. The invoices come from `@/hooks/receivables`, and the
 * filters, page and open sheet live in the URL.
 *
 * `draft` pre-fills a new invoice — the trip page's "Raise invoice" hands over
 * its trip, so the desk does not pick it twice. `payment` is the payment being
 * corrected; null means a new one.
 */
export const useReceivablesStore = create((set) => ({
  invoiceModalOpen: false,
  editingInvoice: null,
  draft: null,

  paymentModalOpen: false,
  paymentInvoice: null,
  editingPayment: null,

  openAddModal: (draft = null) => set({ invoiceModalOpen: true, editingInvoice: null, draft }),
  openEditModal: (invoice) => set({ invoiceModalOpen: true, editingInvoice: invoice, draft: null }),
  closeInvoiceModal: () => set({ invoiceModalOpen: false, editingInvoice: null, draft: null }),

  openPaymentModal: (invoice, payment = null) =>
    set({ paymentModalOpen: true, paymentInvoice: invoice, editingPayment: payment }),
  closePaymentModal: () => set({ paymentModalOpen: false, paymentInvoice: null, editingPayment: null }),
}));
