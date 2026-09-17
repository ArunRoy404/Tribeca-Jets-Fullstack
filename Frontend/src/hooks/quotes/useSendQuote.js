"use client";

import { useMutation } from "@tanstack/react-query";
import { quotesService } from "@/services/quotes.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/**
 * Marks a quote as sent, and moves the enquiry behind it to QUOTED.
 *
 * **Nothing is emailed.** The toast says "marked as sent" rather than "sent to
 * the client" on purpose — no delivery exists until Email Templates (#21), and
 * a broker who believes a quote went out when it did not will not chase it.
 */
export function useSendQuote() {
  return useMutation({
    mutationFn: (payload) => quotesService.send(payload),
    onSuccess: () => {
      invalidate(queryKeys.quotes.all);
      invalidate(queryKeys.tripRequests.all);
      toastSuccess("Quote marked as sent");
    },
    onError: (error) => toastApiError(error, "Could not send this quote"),
  });
}
