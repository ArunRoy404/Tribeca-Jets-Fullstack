"use client";

import { useMutation } from "@tanstack/react-query";
import { tripsService } from "@/services/trips.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** Books a trip by hand. Linking a trip request converts it, so requests refresh too. */
export function useCreateTrip() {
  return useMutation({
    mutationFn: (payload) => tripsService.create(payload),
    onSuccess: (data) => {
      invalidate(queryKeys.trips.all, queryKeys.tripRequests.all, queryKeys.clients.all);
      toastSuccess(`Trip TJ-${data?.reference} booked`);
    },
    onError: (error) => toastApiError(error, "Could not book this trip"),
  });
}
