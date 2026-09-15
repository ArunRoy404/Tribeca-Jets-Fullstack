"use client";

import { useMutation } from "@tanstack/react-query";
import { airportsService } from "@/services/airports.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/**
 * Brings an archived airport back, with every field intact.
 *
 * This is the only way to restore. Re-adding the ICAO through the create form
 * is refused by the API, because it would overwrite the stored record with
 * whatever was typed into the form.
 */
export function useRestoreAirport() {
  return useMutation({
    mutationFn: (airport) => airportsService.restore(airport?.id ?? airport),
    onSuccess: (data) => {
      // Both tabs change — the row leaves Archived and joins the live list —
      // so the whole prefix goes rather than one list.
      invalidate(queryKeys.airports.all);
      toastSuccess(`${data?.icao} restored`, data?.name);
    },
    onError: (error) => toastApiError(error, "Could not restore this airport"),
  });
}
