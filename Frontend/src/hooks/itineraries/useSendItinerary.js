"use client";

import { useMutation } from "@tanstack/react-query";
import { itinerariesService } from "@/services/itineraries.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** Marks the document sent to the client. Delivers nothing itself — emailing
 * it is the shared compose form (Email Templates, #21), which calls this once
 * a mail server accepts the email. */
export function useSendItinerary() {
  return useMutation({
    mutationFn: (id) => itinerariesService.send(id),
    onSuccess: (data) => {
      invalidate(queryKeys.itineraries.all, queryKeys.trips.all);
      toastSuccess(`Itinerary for ${data?.tripReference} marked sent`);
    },
    onError: (error) => toastApiError(error, "Could not mark this itinerary sent"),
  });
}
