"use client";

import { useMutation } from "@tanstack/react-query";
import { authService } from "@/services/auth.service";
import { queryKeys } from "@/lib/queryKeys";
import { invalidate } from "@/lib/queryClient";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** A signed-in password change. Every other device is signed out by the API. */
export function useChangePassword({ onDone } = {}) {
  return useMutation({
    mutationFn: authService.changePassword,
    onSuccess: (data) => {
      const others = data?.signedOutSessions ?? 0;
      toastSuccess(
        "Password changed",
        others
          ? `Signed out ${others} other session${others === 1 ? "" : "s"}.`
          : "You stay signed in on this device.",
      );
      invalidate(queryKeys.auth.sessionsAll);
      onDone?.();
    },
    onError: (error) => toastApiError(error, "Could not change your password"),
  });
}
