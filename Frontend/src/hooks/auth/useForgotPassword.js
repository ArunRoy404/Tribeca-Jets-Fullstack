"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { authService } from "@/services/auth.service";
import { toastApiError, toastDevCode, toastSuccess } from "@/lib/toast";
import { useAuthStore } from "@/store/useAuthStore";

/**
 * Starts a password reset from `/forgot-password`. Call with `{ email }`.
 *
 * The API answers identically whether or not the address is registered, so the
 * copy stays deliberately conditional — claiming the account exists would undo
 * the server's anti-enumeration design.
 */
export function useForgotPassword() {
  const router = useRouter();
  const startFlow = useAuthStore((s) => s?.startFlow);

  return useMutation({
    mutationFn: authService.forgotPassword,
    onSuccess: (data) => {
      startFlow?.({
        flow: "passwordReset",
        email: data?.email,
        expiresInSeconds: data?.expiresInSeconds,
      });

      toastSuccess(
        "Check your email",
        data?.message ?? "If that email is registered, a reset code is on its way.",
      );
      toastDevCode(data);

      router.push("/forgot-password/verify");
    },
    onError: (error) => toastApiError(error, "Could not start the reset"),
  });
}
