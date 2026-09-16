"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { authService } from "@/services/auth.service";
import { toastApiError, toastSuccess } from "@/lib/toast";

/**
 * Verifies the reset code on `/forgot-password/verify`. Call with `{ code }`.
 *
 * Success only unlocks the next step — the password is set on
 * `/reset-password`.
 */
export function useVerifyResetCode() {
  const router = useRouter();

  return useMutation({
    mutationFn: authService.verifyResetCode,
    onSuccess: () => {
      toastSuccess("Email verified", "Choose a new password to finish.");
      router.push("/reset-password");
    },
    onError: (error) => toastApiError(error, "Could not verify that code"),
  });
}
