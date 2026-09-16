"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { authService } from "@/services/auth.service";
import { queryKeys } from "@/lib/queryKeys";
import { setQueryData } from "@/lib/queryClient";
import { toastApiError, toastDevCode, toastSuccess } from "@/lib/toast";
import { useAuthStore } from "@/store/useAuthStore";
import { useRedirectTarget } from "./useRedirectTarget";

/**
 * Sign-in for `/sign-in`.
 *
 * Owns the whole outcome — where to navigate, what to toast, seeding the user
 * cache. The page calls `mutate(values)` and reads whatever it needs off the
 * returned mutation.
 */
export function useLogin() {
  const router = useRouter();
  const startFlow = useAuthStore((s) => s?.startFlow);
  // Honours ?next= when the proxy bounced the user off a protected route.
  const redirectTarget = useRedirectTarget();

  return useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      // Two-factor is per account, so the destination comes from the response
      // rather than being fixed by the screen.
      if (data?.requiresTwoFactor) {
        startFlow?.({
          flow: "twoFactor",
          email: data?.email,
          expiresInSeconds: data?.expiresInSeconds,
        });

        toastSuccess(
          "Verification code sent",
          `We sent a 6-digit code to ${data?.email ?? "your email"}.`,
        );
        toastDevCode(data);

        router.push("/sign-in/two-factor");
        return;
      }

      // Seed the cache so the dashboard does not flash a loading state for a
      // user we were just handed.
      setQueryData(queryKeys.auth.currentUser, data?.user ?? null);

      toastSuccess(`Welcome back, ${data?.user?.firstName ?? "there"}`);
      router.push(redirectTarget);
    },
    onError: (error) => toastApiError(error, "Could not sign you in"),
  });
}
