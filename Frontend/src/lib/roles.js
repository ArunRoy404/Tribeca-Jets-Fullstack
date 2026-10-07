/**
 * Roles that can own a book of business — who a "broker" picker or filter
 * offers.
 *
 * The one copy. There were eight, and they disagreed: the Clients screens left
 * out ADMIN, so an administrator who owns clients could be assigned them in
 * one dialog and not found by the filter on the next screen. Import this;
 * never re-list the roles in a component.
 */
export const BROKER_ROLES = new Set(["BROKER", "ADMIN"]);

/**
 * The outside partner who refers clients (client adjustment #11). Signs in to
 * the partner portal at `/portal` and never sees the CRM — the API denies it
 * everything else; this only decides which shell to render.
 */
export const REFERRAL_AGENT = "REFERRAL_AGENT";

export function isPartnerRole(role) {
  return role === REFERRAL_AGENT;
}

export const PORTAL_HOME = "/portal";
export const CRM_HOME = "/dashboard";

/**
 * Where a signed-in user belongs: the portal for a partner, the CRM for staff.
 *
 * Decided by the real role, whatever ROLE_RESTRICTIONS_ENABLED says (7 Oct
 * 2026): which half of the app someone uses is not a permission. With the
 * switch overriding it, a referral agent landed on the staff CRM's own
 * Referrals and Commissions screens.
 */
export function homeFor(role) {
  return isPartnerRole(role) ? PORTAL_HOME : CRM_HOME;
}

const inArea = (path, home) => path === home || String(path ?? "").startsWith(`${home}/`);

/** Whether `path` lies inside the area `role` is allowed to use. */
export function belongsIn(role, path) {
  return inArea(path, homeFor(role));
}

/**
 * Where to send someone after sign-in: the page they were bounced from when it
 * is in their own area (a broker's `?next=/dashboard/trips/…`), otherwise their
 * home. A partner holding a CRM link lands on the portal, never on a CRM page
 * whose every panel would refuse them — and a broker holding a portal link
 * lands on the CRM.
 */
export function landingFor(role, target) {
  return target && belongsIn(role, target) ? target : homeFor(role);
}
