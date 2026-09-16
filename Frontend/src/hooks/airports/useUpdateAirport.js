"use client";

import { useMutation } from "@tanstack/react-query";
import { airportsService } from "@/services/airports.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** Updates an airport. Call with `{ id, ...changedFields }`. */
export function useUpdateAirport() {
  return useMutation({
    mutationFn: airportsService.update,
    onSuccess: (data, variables) => {
      invalidate(queryKeys.airports.all);
      invalidate(queryKeys.airports.detail(variables?.id));
      toastSuccess(`${data?.icao} updated`, data?.name);
    },
    onError: (error) => toastApiError(error, "Could not update this airport"),
  });
}
