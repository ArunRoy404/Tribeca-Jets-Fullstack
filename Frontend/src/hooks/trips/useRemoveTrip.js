"use client";

import { useMutation } from "@tanstack/react-query";
import { tripsService } from "@/services/trips.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** Archives one trip or several. An administrator's call; a broker cancels instead. */
export function useRemoveTrip() {
  return useMutation({
    mutationFn: (ids) => (Array.isArray(ids) ? tripsService.removeMany(ids) : tripsService.remove(ids)),
    onSuccess: (data, variables) => {
      invalidate(queryKeys.trips.all);
      const count = Array.isArray(variables) ? (data?.affected ?? variables.length) : 1;
      toastSuccess(count === 1 ? "Trip archived" : `${count} trips archived`);
    },
    onError: (error) => toastApiError(error, "Could not archive this trip"),
  });
}
