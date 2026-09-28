"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { authService } from "@/services/auth.service";
import { queryKeys } from "@/lib/queryKeys";
import { setQueryData } from "@/lib/queryClient";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { useAuthStore } from "@/store/useAuthStore";
import { markSessionActivityNow } from "@/hooks/common/useIdleLogout";

/**
 * Two-factor verification for `/sign-in/two-factor`. Call with `{ code }`.
 *
 * Pair with `useAuthFlowGuard("twoFactor", "/sign-in")` on the screen, which
 * handles the "no challenge in progress" redirect.
 */
export function useVerifyTwoFactor() {
  const router = useRouter();
  const clearFlow = useAuthStore((s) => s?.clearFlow);

  return useMutation({
    mutationFn: authService.verifyTwoFactor,
    onSuccess: (data) => {
      setQueryData(queryKeys.auth.currentUser, data?.user ?? null);
      // A stale stamp from a previous session must not carry into this one —
      // see markSessionActivityNow's doc comment.
      markSessionActivityNow();
      clearFlow?.();

      toastSuccess("Signed in successfully");
      router.push("/sign-in/complete");
    },
    onError: (error) => toastApiError(error, "Could not verify that code"),
  });
}
