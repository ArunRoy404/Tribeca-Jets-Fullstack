"use client";

import { useMutation } from "@tanstack/react-query";
import { tripRequestsService } from "@/services/tripRequests.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/**
 * Updates an enquiry. Call with `{ id, ...changedFields }`.
 *
 * Also how a request moves through the pipeline — send `{ status }`.
 */
export function useUpdateTripRequest() {
  return useMutation({
    mutationFn: tripRequestsService.update,
    onSuccess: (data, variables) => {
      invalidate(queryKeys.tripRequests.all);
      invalidate(queryKeys.tripRequests.detail(variables?.id));
      invalidate(queryKeys.clients.all);
      toastSuccess(`Request TR-${data?.reference} updated`);
    },
    onError: (error) => toastApiError(error, "Could not update this request"),
  });
}
