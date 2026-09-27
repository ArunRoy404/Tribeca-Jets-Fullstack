import { request, requestWithMeta } from "@/lib/axios";

/**
 * The desk's charter rates and the instant estimate built on them — client
 * adjustment #6. Services only talk HTTP: no toasts, no cache.
 */
export const charterRatesService = {
  /** GET /charter-rates — one row per aircraft category, priced or not. */
  list: (params) => requestWithMeta({ url: "/charter-rates", method: "GET", params }),

  /** PUT /charter-rates/:category — `null` clears a figure. */
  set: ({ category, ...payload }) =>
    request({ url: `/charter-rates/${category}`, method: "PUT", data: payload }),

  /** POST /charter-rates/estimate — nothing is saved. */
  estimate: (payload) => request({ url: "/charter-rates/estimate", method: "POST", data: payload }),
};
