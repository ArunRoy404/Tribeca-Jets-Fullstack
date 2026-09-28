"use client";

import { useMutation } from "@tanstack/react-query";
import { itinerariesService } from "@/services/itineraries.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

export function useUpdateItinerary() {
  return useMutation({
    mutationFn: (payload) => itinerariesService.update(payload),
    onSuccess: (data) => {
      invalidate(queryKeys.itineraries.all, queryKeys.trips.all);
      toastSuccess(`Itinerary for ${data?.tripReference} saved`);
    },
    onError: (error) => toastApiError(error, "Could not save this itinerary"),
  });
}
