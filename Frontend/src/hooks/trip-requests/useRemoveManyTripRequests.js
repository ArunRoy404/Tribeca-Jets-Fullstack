"use client";

import { useMutation } from "@tanstack/react-query";
import { tripRequestsService } from "@/services/tripRequests.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/**
 * Archives several enquiries at once, for the table's checkbox column.
 *
 * Partial success is success: the API reports ids it could not act on in
 * `skipped` rather than failing the batch, so two people clearing the same
 * rows both succeed. Administrators only — the API enforces it, and a broker
 * who has stopped working a request marks it Lost instead.
 */
export function useRemoveManyTripRequests() {
  return useMutation({
    mutationFn: (ids) => tripRequestsService.removeMany(ids),
    onSuccess: (result) => {
      invalidate(queryKeys.tripRequests.all);
      invalidate(queryKeys.clients.all);
      // The count that actually moved, never the count that was asked for.
      toastSuccess(`${result?.affected ?? 0} request(s) removed`);
    },
    onError: (error) => toastApiError(error, "Could not remove these requests"),
  });
}
