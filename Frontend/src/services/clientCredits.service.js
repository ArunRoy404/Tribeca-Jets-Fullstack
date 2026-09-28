import { request, requestWithMeta } from "@/lib/axios";

/**
 * Money a client has on account with us.
 *
 * Every call names its client, because there is no unscoped ledger: money on
 * account is only meaningful beside the client holding it.
 *
 * No toasts, no redirects, no cache writes; services only talk HTTP.
 */
export const clientCreditsService = {
  /**
   * GET /client-credits/summary
   *
   * `balance`, `credited`, `applied`, the movement count and the last movement
   * date. The balance is summed by the API on every read and is stored
   * nowhere — never cache it as if it were a field on the client.
   */
  summary: (clientId) =>
    request({ url: "/client-credits/summary", method: "GET", params: { clientId } }),

  /** GET /client-credits — the ledger. `archived: true` is the withdrawn half. */
  list: (params) =>
    requestWithMeta({ url: "/client-credits", method: "GET", params }),

  /** POST /client-credits */
  create: (body) =>
    request({ url: "/client-credits", method: "POST", data: body }),

  /** PATCH /client-credits/:id — "can always edit that number". */
  update: ({ id, ...body }) =>
    request({ url: `/client-credits/${id}`, method: "PATCH", data: body }),

  /** DELETE /client-credits/:id — takes it off the balance; nothing is destroyed. */
  remove: (id) => request({ url: `/client-credits/${id}`, method: "DELETE" }),

  /** POST /client-credits/:id/restore — the API re-checks the balance. */
  restore: (id) =>
    request({ url: `/client-credits/${id}/restore`, method: "POST" }),
};
