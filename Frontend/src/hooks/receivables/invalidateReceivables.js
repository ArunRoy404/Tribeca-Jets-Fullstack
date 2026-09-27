import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Everything an invoice or a payment moves: the board, its tiles, the
 * client's Payments tab and total spent (all under the receivables prefix),
 * and the trips that read their billing position from these invoices — the
 * board's "Client Pmt" column, the trip page's paid and balance, and the
 * Payment Attention tile.
 */
export function invalidateReceivables() {
  invalidate(queryKeys.transactions.all);
  invalidate(queryKeys.receivables.all);
  invalidate(queryKeys.trips.all);
}
