/**
 * The permission vocabulary, mirrored from the API.
 *
 * `/auth/me` returns the caller's row of the matrix as `{ PERMISSION: Scope }`,
 * so this file holds the *names* and nothing else — never a copy of who gets
 * what. A second copy of the matrix in JavaScript would drift the first time a
 * scope changed on the server, and it would drift silently.
 *
 * **This is a UI convenience, not a security boundary.** It decides whether to
 * render a button. Every route re-checks the same matrix server-side, because
 * anything sent to a browser can be edited in one.
 */

export const Permission = {
  VIEW_DASHBOARD: "VIEW_DASHBOARD",
  VIEW_TRIPS: "VIEW_TRIPS",
  MANAGE_TRIPS: "MANAGE_TRIPS",
  DELETE_TRIPS: "DELETE_TRIPS",
  VIEW_FINANCIALS: "VIEW_FINANCIALS",
  EXPORT_DATA: "EXPORT_DATA",
  MANAGE_USERS: "MANAGE_USERS",
  OPERATOR_SOURCING: "OPERATOR_SOURCING",
  VIEW_CLIENTS: "VIEW_CLIENTS",
  MANAGE_CLIENTS: "MANAGE_CLIENTS",
  MANAGE_AIRPORTS: "MANAGE_AIRPORTS",
  MANAGE_OPERATORS: "MANAGE_OPERATORS",
  MANAGE_AIRCRAFT: "MANAGE_AIRCRAFT",
  VIEW_COMMISSIONS: "VIEW_COMMISSIONS",
  MANAGE_COMMISSIONS: "MANAGE_COMMISSIONS",
  VIEW_REFERRALS: "VIEW_REFERRALS",
  MANAGE_REFERRALS: "MANAGE_REFERRALS",
  VIEW_TEAM: "VIEW_TEAM",
  VIEW_RECEIVABLES: "VIEW_RECEIVABLES",
  MANAGE_RECEIVABLES: "MANAGE_RECEIVABLES",
  VIEW_OPERATOR_PAYMENTS: "VIEW_OPERATOR_PAYMENTS",
  MANAGE_OPERATOR_PAYMENTS: "MANAGE_OPERATOR_PAYMENTS",
  VIEW_TASKS: "VIEW_TASKS",
  MANAGE_TASKS: "MANAGE_TASKS",
  MANAGE_EMAIL_TEMPLATES: "MANAGE_EMAIL_TEMPLATES",
  SEND_EMAILS: "SEND_EMAILS",
  VIEW_DOCUMENTS: "VIEW_DOCUMENTS",
  MANAGE_DOCUMENTS: "MANAGE_DOCUMENTS",
  VIEW_SENSITIVE_DOCUMENTS: "VIEW_SENSITIVE_DOCUMENTS",
};

/** How far a role may reach. Mirrors `Scope` on the API. */
export const Scope = {
  NONE: "NONE",
  READ: "READ",
  ASSIGNED: "ASSIGNED",
  OWN: "OWN",
  ALL: "ALL",
};

/**
 * TEMPORARY (4 Oct 2026): role restrictions are switched off, on both sides.
 *
 * Every user acts as SUPER_ADMIN until the CRM is finished and the role
 * architecture is redesigned — the API's `ROLE_RESTRICTIONS_ENABLED` holds the
 * same value. While it is `false`, `usePermissions()` answers yes to every
 * question and `lib/roles.js` lets every user into every area, so no control
 * is hidden by role. Flip both constants back to `true` to restore it all.
 */
export const ROLE_RESTRICTIONS_ENABLED = false;

/** Whether this scope permits the action at all. */
export function can(scope) {
  return Boolean(scope) && scope !== Scope.NONE;
}

/**
 * Whether this scope permits *modifying*.
 *
 * READ is a grant for reading and a denial for writing, so a plain `can()` on
 * a write path would wrongly show an assistant the Edit button.
 */
export function canWrite(scope) {
  return can(scope) && scope !== Scope.READ;
}
