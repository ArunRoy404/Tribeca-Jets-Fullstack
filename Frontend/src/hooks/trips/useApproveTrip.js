"use client";

import { useMutation } from "@tanstack/react-query";
import { tripsService } from "@/services/trips.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** Admin approval for a broker-submitted trip (Batch 4 - CRM Feedback 2.1). */
export function useApproveTrip() {
  return useMutation({
    mutationFn: (id) => tripsService.approve(id),
    onSuccess: (data) => {
      invalidate(queryKeys.trips.all, queryKeys.tasks.all, queryKeys.dashboard.all);
      toastSuccess(`TJ-${data?.reference} has been approved`);
    },
    onError: (error) => toastApiError(error, "Could not approve this trip"),
  });
}
