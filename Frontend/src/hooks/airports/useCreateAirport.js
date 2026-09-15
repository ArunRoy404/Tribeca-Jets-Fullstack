"use client";

import { useMutation } from "@tanstack/react-query";
import { airportsService } from "@/services/airports.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/**
 * Adds an airport.
 *
 * Re-adding an ICAO that was removed restores that airport rather than
 * creating a second row, so the toast does not promise a brand new record.
 * A code held by a *live* airport comes back as a 409, which `toastApiError`
 * surfaces verbatim.
 */
export function useCreateAirport() {
  return useMutation({
    mutationFn: airportsService.create,
    onSuccess: (data) => {
      // Stats tiles and the country options both move when a row is added, so
      // the whole prefix goes rather than just the list.
      invalidate(queryKeys.airports.all);
      toastSuccess(`${data?.icao} saved`, data?.name);
    },
    onError: (error) => toastApiError(error, "Could not save this airport"),
  });
}
