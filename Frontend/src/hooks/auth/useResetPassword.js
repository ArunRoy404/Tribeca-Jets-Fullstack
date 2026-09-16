"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { authService } from "@/services/auth.service";
import { clearAllQueries } from "@/lib/queryClient";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { useAuthStore } from "@/store/useAuthStore";

/**
 * Sets the new password on `/reset-password`.
 * Call with `{ newPassword, confirmPassword }`.
 *
 * The API revokes every session on success — including any the user still had
 * open — so the cache is cleared for the same reason: anything still held
 * belongs to a session that no longer exists.
 *
 * Lands on the success screen rather than sign-in directly, so the outcome is
 * confirmed on a page the user can read at their own pace; its CTA carries
 * them on to sign-in.
 *
 * `replace`, not `push`: the reset screen must not be reachable with the back
 * button once its challenge has been consumed.
 */
export function useResetPassword() {
  const router = useRouter();
  const clearFlow = useAuthStore((s) => s?.clearFlow);

  return useMutation({
    mutationFn: authService.resetPassword,
    onSuccess: (data) => {
      clearAllQueries();
      clearFlow?.();

      toastSuccess(
        data?.message ?? "Your password has been changed.",
        "All sessions were signed out. Please sign in with your new password.",
      );
      router.replace("/reset-password/success");
    },
    onError: (error) => toastApiError(error, "Could not reset your password"),
  });
}
