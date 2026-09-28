import { request, requestWithMeta } from "@/lib/axios";

/**
 * The API's `/transactions` endpoints — the money ledger. Read-only: a
 * movement is corrected on the bill it settles, never here.
 */
export const transactionsService = {
  list: (params) => requestWithMeta({ url: "/transactions", method: "GET", params }),
  stats: (params) => request({ url: "/transactions/stats", method: "GET", params }),
};
