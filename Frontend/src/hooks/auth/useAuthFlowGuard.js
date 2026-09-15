"use client";

import { useEffect, useRef } from "react";
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

  /**
   * Completing a step clears the flow, which would otherwise look identical to
   * never having had one — and bounce the user backwards at the exact moment
   * the mutation is navigating them forwards.
   *
   * Once the flow has been active on this screen the guard stands down, so the
   * success navigation wins the race.
   */
  const wasActive = useRef(false);

  useEffect(() => {
    if (isActive) {
      wasActive.current = true;
      return;
    }
    // The flow ended after this screen had it: a completed step, not a missing
    // one. Stand down so the success navigation wins.
    if (wasActive.current) return;

    router.replace(redirectTo);
  }, [isActive, redirectTo, router]);

  return { isActive, challengeEmail, expiresInSeconds };
}
