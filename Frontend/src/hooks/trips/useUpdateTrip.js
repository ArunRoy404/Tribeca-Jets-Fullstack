"use client";

import { useMutation } from "@tanstack/react-query";
import { tripsService } from "@/services/trips.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

export function useUpdateTrip() {
  return useMutation({
    mutationFn: (payload) => tripsService.update(payload),
    onSuccess: (data) => {
      invalidate(queryKeys.trips.all, queryKeys.notes.all);
      toastSuccess(`TJ-${data?.reference} saved`);
    },
    onError: (error) => toastApiError(error, "Could not save this trip"),
  });
}
