import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * Client-side state for the multi-step auth flows.
 *
 * Deliberately holds nothing sensitive: the real flow state is the httpOnly
 * challenge cookie the API sets (`tj_2fa`, `tj_pwreset`). This only remembers
 * what the UI needs to render — which flow is in progress and the masked email
 * to show on the OTP screens.
 *
 * Persisted to sessionStorage so a page refresh mid-flow does not blank the
 * screen; it clears when the tab closes, matching the challenge's own lifetime.
 */
export const useAuthStore = create(
  persist(
    (set) => ({
      /** "twoFactor" | "passwordReset" | null */
      flow: null,
      /** Masked address from the API, e.g. "jo****@tribecajets.com" */
      challengeEmail: null,
      /** Seconds until the current code expires, as reported by the API. */
      expiresInSeconds: null,

      startFlow: ({ flow, email, expiresInSeconds }) =>
        set({ flow, challengeEmail: email ?? null, expiresInSeconds: expiresInSeconds ?? null }),

      updateChallenge: ({ email, expiresInSeconds }) =>
        set((state) => ({
          challengeEmail: email ?? state.challengeEmail,
          expiresInSeconds: expiresInSeconds ?? state.expiresInSeconds,
        })),

      clearFlow: () => set({ flow: null, challengeEmail: null, expiresInSeconds: null }),
    }),
    {
      name: "tj-auth-flow",
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? undefined : window.sessionStorage,
      ),
    },
  ),
);
