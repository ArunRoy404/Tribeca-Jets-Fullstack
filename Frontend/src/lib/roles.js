/**
 * Roles that can own a book of business — who a "broker" picker or filter
 * offers.
 *
 * The one copy. There were eight, and they disagreed: the Clients screens left
 * out ADMIN, so an administrator who owns clients could be assigned them in
 * one dialog and not found by the filter on the next screen. Import this;
 * never re-list the roles in a component.
 */
export const BROKER_ROLES = new Set(["BROKER", "SENIOR_BROKER", "ADMIN"]);

/**
 * The outside partner who refers clients (client adjustment #11). Signs in to
 * the partner portal at `/portal` and never sees the CRM — the API denies it
 * everything else; this only decides which shell to render.
 */
export const REFERRAL_AGENT = "REFERRAL_AGENT";

export function isPartnerRole(role) {
  return role === REFERRAL_AGENT;
}

/** Where a signed-in user belongs: the portal for a partner, the CRM for staff. */
export function homeFor(role) {
  return isPartnerRole(role) ? "/portal" : "/dashboard";
}
