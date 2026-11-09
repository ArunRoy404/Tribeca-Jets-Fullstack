"use client";

import { useMutation } from "@tanstack/react-query";
import { tripsService } from "@/services/trips.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** Admin rejection for a broker-submitted trip (Batch 4 - CRM Feedback 2.1). */
export function useRejectTrip() {
  return useMutation({
    mutationFn: ({ id, reason }) => tripsService.reject({ id, reason }),
    onSuccess: (data) => {
      invalidate(queryKeys.trips.all, queryKeys.tasks.all, queryKeys.dashboard.all);
      toastSuccess(`TJ-${data?.reference} approval was declined`);
    },
    onError: (error) => toastApiError(error, "Could not reject this trip"),
  });
}
