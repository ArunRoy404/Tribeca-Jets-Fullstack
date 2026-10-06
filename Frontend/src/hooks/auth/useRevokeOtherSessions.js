"use client";

import { useMutation } from "@tanstack/react-query";
import { authService } from "@/services/auth.service";
import { queryKeys } from "@/lib/queryKeys";
import { invalidate } from "@/lib/queryClient";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** Signs out every device but this one. */
export function useRevokeOtherSessions() {
  return useMutation({
    mutationFn: authService.revokeOtherSessions,
    onSuccess: (data) => {
      const count = data?.signedOutSessions ?? 0;
      toastSuccess(count ? `Signed out ${count} other device${count === 1 ? "" : "s"}` : "No other devices were signed in");
      invalidate(queryKeys.auth.sessionsAll);
    },
    onError: (error) => toastApiError(error, "Could not sign the other devices out"),
  });
}
