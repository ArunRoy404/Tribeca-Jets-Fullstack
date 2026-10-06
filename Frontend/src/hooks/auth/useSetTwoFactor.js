"use client";

import { useMutation } from "@tanstack/react-query";
import { authService } from "@/services/auth.service";
import { queryKeys } from "@/lib/queryKeys";
import { setQueryData } from "@/lib/queryClient";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** Turns the signed-in user's own two-factor on or off. */
export function useSetTwoFactor({ onDone } = {}) {
  return useMutation({
    mutationFn: authService.setTwoFactor,
    onSuccess: (user) => {
      setQueryData(queryKeys.auth.currentUser, user);
      toastSuccess(
        user?.twoFactorEnabled ? "Two-factor turned on" : "Two-factor turned off",
        user?.twoFactorEnabled ? "Each sign-in will ask for a code sent to your email." : undefined,
      );
      onDone?.();
    },
    onError: (error) => toastApiError(error, "Could not change two-factor"),
  });
}
