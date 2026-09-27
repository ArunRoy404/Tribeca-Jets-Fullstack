import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Everything a bill or a payment moves: the board and its tiles (and the
 * operator tab's and trip card's stats, all under the same prefix), the trips
 * that read their "Op Pmt" position from these bills, and the operators whose
 * Total Paid sums them.
 */
export function invalidateOperatorPayments() {
  invalidate(queryKeys.operatorPayments.all);
  invalidate(queryKeys.trips.all);
  invalidate(queryKeys.operators.all);
}
