"use client";

import { useMutation } from "@tanstack/react-query";
import { tripRequestsService } from "@/services/tripRequests.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** The mirror of `useRemoveManyTripRequests`, for the Archived tab. */
export function useRestoreManyTripRequests() {
  return useMutation({
    mutationFn: (ids) => tripRequestsService.restoreMany(ids),
    onSuccess: (result) => {
      invalidate(queryKeys.tripRequests.all);
      invalidate(queryKeys.clients.all);
      toastSuccess(`${result?.affected ?? 0} request(s) restored`);
    },
    onError: (error) => toastApiError(error, "Could not restore these requests"),
  });
}
