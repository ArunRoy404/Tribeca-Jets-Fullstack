"use client";

import { useMutation } from "@tanstack/react-query";
import { tripRequestsService } from "@/services/tripRequests.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** Brings an archived enquiry back, with every field intact. */
export function useRestoreTripRequest() {
  return useMutation({
    mutationFn: (record) => tripRequestsService.restore(record?.id ?? record),
    onSuccess: (data) => {
      invalidate(queryKeys.tripRequests.all);
      invalidate(queryKeys.clients.all);
      toastSuccess(`TR-${data?.reference} restored`);
    },
    onError: (error) => toastApiError(error, "Could not restore this request"),
  });
}
