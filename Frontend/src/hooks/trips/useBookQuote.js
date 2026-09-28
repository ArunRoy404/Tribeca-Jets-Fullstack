"use client";

import { useMutation } from "@tanstack/react-query";
import { tripsService } from "@/services/trips.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/**
 * Books an approved quote as a trip. The quote now links to its trip and its
 * enquiry is converted, so all three lists refresh.
 */
export function useBookQuote() {
  return useMutation({
    mutationFn: (payload) => tripsService.bookQuote(payload),
    onSuccess: (data) => {
      invalidate(queryKeys.trips.all, queryKeys.quotes.all, queryKeys.tripRequests.all);
      toastSuccess(`Booked as TJ-${data?.reference}`);
    },
    onError: (error) => toastApiError(error, "Could not book this quote"),
  });
}
