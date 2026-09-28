"use client";

import { useMutation } from "@tanstack/react-query";
import { flightTrackingService } from "@/services/flightTracking.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { formatTripReference } from "@/lib/trip";

/**
 * Reports on a flight. `trips.all` covers the board, the tiles, the panel and
 * the schedule; the notes key refreshes the flight's timeline, where the
 * report now appears.
 */
export function useUpdateFlight() {
  return useMutation({
    mutationFn: (payload) => flightTrackingService.update(payload),
    onSuccess: (data) => {
      invalidate(queryKeys.trips.all, queryKeys.notes.all);
      toastSuccess(`Flight update saved for ${formatTripReference(data?.trip?.reference)}`);
    },
    onError: (error) => toastApiError(error, "Could not save this flight update"),
  });
}
