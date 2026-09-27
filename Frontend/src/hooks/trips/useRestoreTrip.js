"use client";

import { useMutation } from "@tanstack/react-query";
import { tripsService } from "@/services/trips.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

export function useRestoreTrip() {
  return useMutation({
    mutationFn: (ids) => (Array.isArray(ids) ? tripsService.restoreMany(ids) : tripsService.restore(ids)),
    onSuccess: (data, variables) => {
      invalidate(queryKeys.trips.all);
      const count = Array.isArray(variables) ? (data?.affected ?? variables.length) : 1;
      toastSuccess(count === 1 ? "Trip restored" : `${count} trips restored`);
    },
    onError: (error) => toastApiError(error, "Could not restore this trip"),
  });
}
