"use client";

import { useMutation } from "@tanstack/react-query";
import { authService } from "@/services/auth.service";
import { toastApiError, toastDevCode, toastSuccess } from "@/lib/toast";
import { useAuthStore } from "@/store/useAuthStore";

/**
 * Resends the two-factor code.
 *
 * The API invalidates the previous code on every resend, so the store is
 * updated with the new expiry rather than leaving the UI implying an older
 * code is still valid.
 */
export function useResendTwoFactor() {
  const updateChallenge = useAuthStore((s) => s?.updateChallenge);

  return useMutation({
    mutationFn: authService.resendTwoFactor,
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
