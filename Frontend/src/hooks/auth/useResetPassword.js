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
 * The API revokes every session on success, so the cache is cleared here too —
 * anything still held would belong to a session that no longer exists.
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
        "All other sessions were signed out.",
      );
      router.push("/reset-password/success");
    },
    onError: (error) => toastApiError(error, "Could not reset your password"),
  });
}
