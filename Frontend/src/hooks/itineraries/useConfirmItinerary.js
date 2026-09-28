"use client";

import { useMutation } from "@tanstack/react-query";
import { itinerariesService } from "@/services/itineraries.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

export function useConfirmItinerary() {
  return useMutation({
    mutationFn: (id) => itinerariesService.confirm(id),
    onSuccess: (data) => {
      invalidate(queryKeys.itineraries.all, queryKeys.trips.all);
      toastSuccess(`Itinerary for ${data?.tripReference} confirmed`);
    },
    onError: (error) => toastApiError(error, "Could not confirm this itinerary"),
  });
}
