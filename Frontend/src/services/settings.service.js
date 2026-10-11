import { request } from "@/lib/axios";

/**
 * The company's settings (#26) — one set, for the whole company.
 *
 * No toasts, no redirects, no cache writes; services only talk HTTP.
 */
export const settingsService = {
  /** GET /settings — `{ company, defaults, security, notifications, updatedAt }`. */
  get: () => request({ url: "/settings", method: "GET" }),

  /** PATCH /settings — one or more sections, each with only the fields to change. */
  update: (body) => request({ url: "/settings", method: "PATCH", data: body }),

  /**
   * GET /settings/branding — public, no session needed. Name, logo address,
   * contact details when the company shows them, and the document toggles.
   */
  branding: () => request({ url: "/settings/branding", method: "GET" }),
};
