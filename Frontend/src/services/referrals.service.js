import { request, requestWithMeta } from "@/lib/axios";

/**
 * Thin wrappers around `/referrals` and `/referral-resources` (#11).
 *
 * The desk and the partner portal call the same endpoints; the API decides
 * what each role may read and projects the agent's view down to what they
 * submitted. Converting a referral is its own call — it creates the client
 * and the trip request on the desk's side.
 */
export const referralsService = {
  list: (params) => requestWithMeta({ url: "/referrals", method: "GET", params }),
  stats: () => request({ url: "/referrals/stats", method: "GET" }),
  detail: (id) => request({ url: `/referrals/${id}`, method: "GET" }),

  /** POST /referrals — an agent submits as themselves; the desk names `agentId`. */
  submit: (payload) => request({ url: "/referrals", method: "POST", data: payload }),

  /** PATCH /referrals/:id — status, assigned broker, the trip it booked. Desk only. */
  update: ({ id, ...payload }) => request({ url: `/referrals/${id}`, method: "PATCH", data: payload }),

  /** POST /referrals/:id/convert — into a client and a trip request. */
  convert: ({ id, ...payload }) => request({ url: `/referrals/${id}/convert`, method: "POST", data: payload }),

  remove: (id) => request({ url: `/referrals/${id}`, method: "DELETE" }),
  removeMany: (ids) => request({ url: "/referrals/bulk-delete", method: "POST", data: { ids } }),
  restore: (id) => request({ url: `/referrals/${id}/restore`, method: "POST" }),
  restoreMany: (ids) => request({ url: "/referrals/bulk-restore", method: "POST", data: { ids } }),

  resources: (params) => requestWithMeta({ url: "/referral-resources", method: "GET", params }),
  createResource: (payload) => request({ url: "/referral-resources", method: "POST", data: payload }),
  updateResource: ({ id, ...payload }) =>
    request({ url: `/referral-resources/${id}`, method: "PATCH", data: payload }),
  removeResource: (id) => request({ url: `/referral-resources/${id}`, method: "DELETE" }),
  restoreResource: (id) => request({ url: `/referral-resources/${id}/restore`, method: "POST" }),
};

/**
 * The address a referral's attachment opens at. The file is the agent's
 * private upload; the desk reads it through the referral, which the API
 * checks. The agent's own copy opens at its ordinary upload URL.
 */
export function referralAttachmentUrl(referralId, url) {
  const uploadId = String(url ?? "").split("/").pop();
  return `/api/referrals/${referralId}/attachments/${uploadId}`;
}
