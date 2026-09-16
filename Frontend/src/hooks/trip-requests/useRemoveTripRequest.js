"use client";

import { useMutation } from "@tanstack/react-query";
import { tripRequestsService } from "@/services/tripRequests.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/**
 * Archives an enquiry. Administrators only — the API enforces it.
 *
 * A broker who has stopped working one marks it Lost instead, which keeps it
 * in the pipeline history and in the conversion figures.
 */
export function useRemoveTripRequest() {
  return useMutation({
    mutationFn: (record) => tripRequestsService.remove(record?.id ?? record),
    onSuccess: (_data, record) => {
      invalidate(queryKeys.tripRequests.all);
      invalidate(queryKeys.clients.all);
      toastSuccess(`${record?.reference ?? "Request"} removed`);
    },
    onError: (error) => toastApiError(error, "Could not remove this request"),
  });
}
