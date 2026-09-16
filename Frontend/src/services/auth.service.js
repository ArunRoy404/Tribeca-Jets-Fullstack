import { request } from "@/lib/axios";

/**
 * Thin, one-to-one wrappers around the API's auth endpoints.
 *
 * No toasts, no redirects, no cache writes — services only talk HTTP. Every
 * side effect lives in the hooks, so these stay trivially reusable and testable.
 */
export const authService = {
  /**
   * POST /auth/login
   * → { requiresTwoFactor: false, user }            session is live
   * → { requiresTwoFactor: true, email, expiresInSeconds }  code was sent
   */
  login: ({ email, password, rememberMe = false }) =>
    request({
      url: "/auth/login",
      method: "POST",
      data: { email, password, rememberMe },
    }),

  /** POST /auth/two-factor/verify — body carries only the code. */
  verifyTwoFactor: ({ code }) =>
    request({ url: "/auth/two-factor/verify", method: "POST", data: { code } }),

  /** POST /auth/two-factor/resend — invalidates the previous code. */
  resendTwoFactor: () =>
    request({ url: "/auth/two-factor/resend", method: "POST", data: {} }),

  /** GET /auth/me — how the app learns who is signed in. */
  currentUser: () => request({ url: "/auth/me", method: "GET" }),

  /** POST /auth/logout — revokes the refresh token server-side. */
  logout: () => request({ url: "/auth/logout", method: "POST", data: {} }),

  /** POST /auth/forgot-password — always succeeds, registered or not. */
  forgotPassword: ({ email }) =>
    request({ url: "/auth/forgot-password", method: "POST", data: { email } }),

  /** POST /auth/forgot-password/verify — unlocks the reset step. */
  verifyResetCode: ({ code }) =>
    request({ url: "/auth/forgot-password/verify", method: "POST", data: { code } }),

  /** POST /auth/forgot-password/resend */
  resendResetCode: () =>
    request({ url: "/auth/forgot-password/resend", method: "POST", data: {} }),

  /** POST /auth/reset-password — revokes every session on success. */
  resetPassword: ({ newPassword, confirmPassword }) =>
    request({
      url: "/auth/reset-password",
      method: "POST",
      data: { newPassword, confirmPassword },
    }),
};
