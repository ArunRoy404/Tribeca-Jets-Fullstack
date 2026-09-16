"use client";

import { useMutation } from "@tanstack/react-query";
import { aircraftService } from "@/services/aircraft.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** Brings an archived aircraft back, with every field intact. */
export function useRestoreAircraft() {
  return useMutation({
    mutationFn: (aircraft) => aircraftService.restore(aircraft?.id ?? aircraft),
    onSuccess: (data) => {
      // Both tabs change, so the whole prefix goes rather than one list.
      invalidate(queryKeys.aircraft.all);
      invalidate(queryKeys.operators.all);
      toastSuccess(`${data?.tailNumber} restored`);
    },
    onError: (error) => toastApiError(error, "Could not restore this aircraft"),
  });
}
