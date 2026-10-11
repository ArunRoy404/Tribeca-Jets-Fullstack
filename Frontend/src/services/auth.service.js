import { request, requestWithMeta } from "@/lib/axios";

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

  /**
   * POST /auth/activity — tells the server a person is using this device, so
   * its idle limit follows real activity. Throttled by `useIdleLogout`.
   */
  activity: () => request({ url: "/auth/activity", method: "POST", data: {} }),

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

  // --- My Account -----------------------------------------------------------

  /** PATCH /auth/me — own name, phone, photo. Answers with the /auth/me shape. */
  updateProfile: (data) => request({ url: "/auth/me", method: "PATCH", data }),

  /** POST /auth/change-password — signs out every other session. */
  changePassword: ({ currentPassword, newPassword, confirmPassword }) =>
    request({
      url: "/auth/change-password",
      method: "POST",
      data: { currentPassword, newPassword, confirmPassword },
    }),

  /** PATCH /auth/two-factor — own two-factor on/off, password required. */
  setTwoFactor: ({ enabled, currentPassword }) =>
    request({ url: "/auth/two-factor", method: "PATCH", data: { enabled, currentPassword } }),

  /** GET /auth/sessions — signed-in devices, paginated. */
  sessions: (params) => requestWithMeta({ url: "/auth/sessions", method: "GET", params }),

  /** DELETE /auth/sessions/:id — sign out one other device. */
  revokeSession: (id) => request({ url: `/auth/sessions/${id}`, method: "DELETE" }),

  /** POST /auth/sessions/revoke-others — sign out every other device. */
  revokeOtherSessions: () =>
    request({ url: "/auth/sessions/revoke-others", method: "POST", data: {} }),
};
