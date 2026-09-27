"use client";

import { useMutation } from "@tanstack/react-query";
import { itinerariesService } from "@/services/itineraries.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** Builds the document for a trip. Also refreshes the trip itself — its
 * confirmation checklist and flight-info card read the itinerary summary. */
export function useCreateItinerary() {
  return useMutation({
    mutationFn: (payload) => itinerariesService.create(payload),
    onSuccess: (data) => {
      invalidate(queryKeys.itineraries.all, queryKeys.trips.all);
      toastSuccess(`Itinerary built for ${data?.tripReference}`);
    },
    onError: (error) => toastApiError(error, "Could not build this itinerary"),
  });
}
