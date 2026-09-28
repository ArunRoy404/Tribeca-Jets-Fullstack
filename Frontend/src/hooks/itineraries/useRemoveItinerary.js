"use client";

import { useMutation } from "@tanstack/react-query";
import { itinerariesService } from "@/services/itineraries.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** Archives one itinerary or several. */
export function useRemoveItinerary() {
  return useMutation({
    mutationFn: (ids) => (Array.isArray(ids) ? itinerariesService.removeMany(ids) : itinerariesService.remove(ids)),
    onSuccess: (data, variables) => {
      invalidate(queryKeys.itineraries.all, queryKeys.trips.all);
      const count = Array.isArray(variables) ? (data?.affected ?? variables.length) : 1;
      toastSuccess(count === 1 ? "Itinerary archived" : `${count} itineraries archived`);
    },
    onError: (error) => toastApiError(error, "Could not archive this itinerary"),
  });
}
