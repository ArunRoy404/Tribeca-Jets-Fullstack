"use client";

import { useMutation } from "@tanstack/react-query";
import { tripsService } from "@/services/trips.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { formatTripStatus } from "@/lib/trip";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** One step along the lifecycle. The move lands on the trip's timeline. */
export function useChangeTripStatus() {
  return useMutation({
    mutationFn: (payload) => tripsService.changeStatus(payload),
    onSuccess: (data) => {
      invalidate(queryKeys.trips.all, queryKeys.notes.all);
      toastSuccess(`TJ-${data?.reference} is now ${formatTripStatus(data?.status)}`);
    },
    onError: (error) => toastApiError(error, "Could not move this trip"),
  });
}
