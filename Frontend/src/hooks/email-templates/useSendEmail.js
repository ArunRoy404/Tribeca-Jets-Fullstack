"use client";

import { useMutation } from "@tanstack/react-query";
import { emailsService } from "@/services/emailTemplates.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastInfo, toastSuccess } from "@/lib/toast";
import { emailWillReachRecipient } from "@/lib/email";

/**
 * Queues an email and records it; the API answers at once and a background
 * worker sends it. The toast says what will actually happen: "on its way"
 * when a mail server is configured, and "recorded, not delivered" when none
 * is — so nobody chases a client about an email that never left. A later
 * refusal shows as Failed in the sent log and on the record's timeline.
 */
export function useSendEmail() {
  return useMutation({
    mutationFn: (payload) => emailsService.send(payload),
    onSuccess: (data) => {
      invalidate(queryKeys.emails.all, queryKeys.emailTemplates.all, queryKeys.notes.all);
      if (!emailWillReachRecipient(data)) {
        toastInfo(
          "Recorded, not delivered",
          `No mail server is configured, so nothing will reach ${data?.toEmail}. It is in the sent log.`,
        );
      } else {
        toastSuccess(`Email on its way to ${data?.toName}`, `${data?.toEmail} · the sent log shows when it is delivered.`);
      }
    },
    onError: (error) => {
      // A refusal is recorded too — the log should show the attempt.
      invalidate(queryKeys.emails.all);
      toastApiError(error, "Could not send this email");
    },
  });
}
