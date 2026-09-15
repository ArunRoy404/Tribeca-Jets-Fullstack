"use client";

import { useMutation } from "@tanstack/react-query";
import { airportsService } from "@/services/airports.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/**
 * Removes an airport. Soft delete — the row is kept because trips and
 * itineraries will reference it.
 */
export function useRemoveAirport() {
  return useMutation({
    mutationFn: (airport) => airportsService.remove(airport?.id ?? airport),
    onSuccess: (_data, airport) => {
      invalidate(queryKeys.airports.all);
      toastSuccess(
        `${airport?.icao ?? "Airport"} removed`,
        "Add it again with the same ICAO to restore it.",
      );
    },
    onError: (error) => toastApiError(error, "Could not remove this airport"),
  });
}
