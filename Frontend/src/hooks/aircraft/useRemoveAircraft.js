"use client";

import { useMutation } from "@tanstack/react-query";
import { aircraftService } from "@/services/aircraft.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/**
 * Removes an aircraft. Soft delete — quotes and trips will reference it, and
 * destroying it would orphan the history of every flight it flew.
 *
 * Not how a tail leaves a fleet in normal use: that is `status: INACTIVE`,
 * which keeps it listed and searchable.
 */
export function useRemoveAircraft() {
  return useMutation({
    mutationFn: (aircraft) => aircraftService.remove(aircraft?.id ?? aircraft),
    onSuccess: (_data, aircraft) => {
      invalidate(queryKeys.aircraft.all);
      invalidate(queryKeys.operators.all);
      toastSuccess(`${aircraft?.tailNumber ?? "Aircraft"} removed`);
    },
    onError: (error) => toastApiError(error, "Could not remove this aircraft"),
  });
}
