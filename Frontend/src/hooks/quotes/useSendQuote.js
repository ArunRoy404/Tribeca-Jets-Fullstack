"use client";

import { useMutation } from "@tanstack/react-query";
import { quotesService } from "@/services/quotes.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/**
 * Marks a quote as sent, and moves the enquiry behind it to QUOTED.
 *
 * **Nothing is emailed here.** Emailing is its own act — `useSendEmail`
 * through the shared compose form (Email Templates, #21), which calls this
 * once a mail server accepts the email. The toast says "marked as sent" on
 * purpose: a broker who believes a quote went out when it did not will not
 * chase it.
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
