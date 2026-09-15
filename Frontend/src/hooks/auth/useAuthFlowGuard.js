"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

/**
 * Guards a multi-step auth screen and exposes the flow's UI state.
 *
 * Kept separate from the mutation hooks so those can return their mutation
 * object untouched. Landing on an OTP screen without a challenge in progress —
 * a bookmark, or a refresh after the cookie expired — bounces back to the start
 * rather than showing a code box that could never succeed.
 *
 * @param {"twoFactor"|"passwordReset"} expectedFlow
 * @param {string} redirectTo - where to send the user when no flow is active
 */
export function useAuthFlowGuard(expectedFlow, redirectTo) {
  const router = useRouter();
  const flow = useAuthStore((s) => s?.flow);
  const challengeEmail = useAuthStore((s) => s?.challengeEmail);
  const expiresInSeconds = useAuthStore((s) => s?.expiresInSeconds);

  const isActive = flow === expectedFlow;

  useEffect(() => {
    if (!isActive) router.replace(redirectTo);
  }, [isActive, redirectTo, router]);

  return { isActive, challengeEmail, expiresInSeconds };
}
