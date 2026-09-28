"use client";

import { useMutation } from "@tanstack/react-query";
import { emailsService } from "@/services/emailTemplates.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastInfo, toastSuccess } from "@/lib/toast";

/**
 * Sends an email and records it. The toast says what actually happened:
 * "sent" only when a mail server accepted it. Without one configured the API
 * records it as LOGGED — delivered to nobody — and the toast says exactly
 * that, so nobody chases a client about an email that never left.
 */
export function useSendEmail() {
  return useMutation({
    mutationFn: (payload) => emailsService.send(payload),
    onSuccess: (data) => {
      invalidate(queryKeys.emails.all, queryKeys.emailTemplates.all, queryKeys.notes.all);
      if (data?.status === "LOGGED") {
        toastInfo(
          "Recorded, not delivered",
          `No mail server is configured, so nothing reached ${data?.toEmail}. It is in the sent log.`,
        );
      } else {
        toastSuccess(`Email sent to ${data?.toName}`, data?.toEmail);
      }
    },
    onError: (error) => {
      // A refusal is recorded too — the log should show the attempt.
      invalidate(queryKeys.emails.all);
      toastApiError(error, "Could not send this email");
    },
  });
}
