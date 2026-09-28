"use client";

import { useMutation } from "@tanstack/react-query";
import { itinerariesService } from "@/services/itineraries.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

export function useRestoreItinerary() {
  return useMutation({
    mutationFn: (ids) => (Array.isArray(ids) ? itinerariesService.restoreMany(ids) : itinerariesService.restore(ids)),
    onSuccess: (data, variables) => {
      invalidate(queryKeys.itineraries.all, queryKeys.trips.all);
      const count = Array.isArray(variables) ? (data?.affected ?? variables.length) : 1;
      toastSuccess(count === 1 ? "Itinerary restored" : `${count} itineraries restored`);
    },
    onError: (error) => toastApiError(error, "Could not restore this itinerary"),
  });
}
