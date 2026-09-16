"use client";

import { useMutation } from "@tanstack/react-query";
import { aircraftService } from "@/services/aircraft.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/**
 * Adds an aircraft.
 *
 * A tail number already in use returns 409, and `toastApiError` surfaces the
 * API's message rather than a generic one — for an archived tail that message
 * is the instruction to restore it, which is the only way to get the airframe
 * back with its history.
 *
 * The operator's fleet changes too, so its keys are invalidated alongside.
 */
export function useCreateAircraft() {
  return useMutation({
    mutationFn: aircraftService.create,
    onSuccess: (data) => {
      // The status tiles move too, so the whole prefix goes.
      invalidate(queryKeys.aircraft.all);
      invalidate(queryKeys.operators.all);
      toastSuccess(`${data?.tailNumber} added`, data?.model || undefined);
    },
    onError: (error) => toastApiError(error, "Could not save this aircraft"),
  });
}
