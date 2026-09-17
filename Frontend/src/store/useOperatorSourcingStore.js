"use client";

import { create } from "zustand";

/**
 * Client-only state for the Operator Sourcing screens.
 *
 * Server data lives in React Query — the board reads `useTripRequests` and the
 * detail sheet reads `useOperatorQuotes`. What is left here is the things the
 * server does not own: which dialog is open, and on which row.
 *
 * Table state — search, filters, paging — is not here either. It lives in the
 * URL through `useSourcingTableParams`, so a pasted link reproduces exactly
 * what the sender was looking at.
 */
export const useOperatorSourcingStore = create((set) => ({
  /** The enquiry whose detail sheet is open. */
  selectedRequestId: null,
  /** The New Sourcing Request dialog. */
  newRequestOpen: false,
  /** The enquiry the "Ask an operator" dialog is filing against. */
  quoteRequestId: null,

  selectRequest: (id) => set({ selectedRequestId: id }),
  closeRequestDetail: () => set({ selectedRequestId: null }),

  openNewRequest: () => set({ newRequestOpen: true }),
  closeNewRequest: () => set({ newRequestOpen: false }),

  openQuoteRequest: (id) => set({ quoteRequestId: id }),
  closeQuoteRequest: () => set({ quoteRequestId: null }),
}));
