"use client";

import { useMutation } from "@tanstack/react-query";
import { aircraftService } from "@/services/aircraft.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/**
 * Updates an aircraft. Call with `{ id, ...changedFields }`.
 *
 * Also how a tail is grounded — the Set Maintenance dialog sends `{ status }`
 * through here, so there is one write path and one audit entry shape rather
 * than a second endpoint that means almost the same thing.
 *
 * `amenities` is replaced wholesale by the API, so send the complete list
 * rather than the additions.
 */
export function useUpdateAircraft() {
  return useMutation({
    mutationFn: aircraftService.update,
    onSuccess: (data, variables) => {
      invalidate(queryKeys.aircraft.all);
      invalidate(queryKeys.aircraft.detail(variables?.id));
      // Reassigning a tail moves it between two operators' fleets.
      invalidate(queryKeys.operators.all);
      toastSuccess(`${data?.tailNumber} updated`);
    },
    onError: (error) => toastApiError(error, "Could not update this aircraft"),
  });
}
