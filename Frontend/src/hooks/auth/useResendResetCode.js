"use client";

import { useMutation } from "@tanstack/react-query";
import { authService } from "@/services/auth.service";
import { toastApiError, toastDevCode, toastSuccess } from "@/lib/toast";
import { useAuthStore } from "@/store/useAuthStore";

/** Resends the password-reset code, invalidating the previous one. */
export function useResendResetCode() {
  const updateChallenge = useAuthStore((s) => s?.updateChallenge);

  return useMutation({
    mutationFn: authService.resendResetCode,
    onSuccess: (data) => {
      updateChallenge?.({
        email: data?.email,
        expiresInSeconds: data?.expiresInSeconds,
      });

      toastSuccess("New code sent", "The previous code is no longer valid.");
      toastDevCode(data);
    },
    onError: (error) => toastApiError(error, "Could not resend the code"),
  });
}
