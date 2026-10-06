import { uploadUrl } from "@/services/uploads.service";

/**
 * Display helpers for the authenticated user.
 *
 * The API returns roles as enum constants (`SUPER_ADMIN`); the UI shows them as
 * words. Kept here rather than in a component so the users-and-roles screens
 * label them identically to the nav.
 */

const ROLE_LABELS = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  SENIOR_BROKER: "Senior Broker",
  BROKER: "Broker",
  ASSISTANT: "Assistant",
  REFERRAL_AGENT: "Referral Agent",
};

const STATUS_LABELS = {
  ACTIVE: "Active",
  INVITED: "Invited",
  SUSPENDED: "Suspended",
};

/**
 * Roles an administrator can assign.
 *
 * `SUPER_ADMIN` is absent deliberately — the API refuses to assign it, so
 * offering it in a dropdown would only produce a 400. Mirrors
 * `ASSIGNABLE_ROLES` on the backend.
 */
export const ASSIGNABLE_ROLES = [
  "ADMIN",
  "SENIOR_BROKER",
  "BROKER",
  "ASSISTANT",
  "REFERRAL_AGENT",
];

/** Every role, for the table's filter. Includes SUPER_ADMIN, which is filterable
 *  even though it is not assignable. */
export const FILTERABLE_ROLES = ["SUPER_ADMIN", ...ASSIGNABLE_ROLES];

export const FILTERABLE_STATUSES = ["ACTIVE", "INVITED", "SUSPENDED"];

/**
 * Statuses an administrator can actually set.
 *
 * `INVITED` is filterable but not settable: an account leaves that state on its
 * own, when the invitee sets a password through "Forgot password?". Offering it
 * as a choice would produce a 400, and pushing a live account back to pending is
 * not a state anything could undo. Mirrors `manageableStatusSchema` on the API.
 */
export const MANAGEABLE_STATUSES = ["ACTIVE", "SUSPENDED"];

/** True while an invitation is still outstanding — nothing may set its status. */
export function isPendingInvite(status) {
  return status === "INVITED";
}

export function formatUserStatus(status) {
  if (!status) return "";
  return STATUS_LABELS[status] ?? status;
}

/**
 * `lastLoginAt` is null for an account that has never signed in, which is the
 * normal state of an invited user rather than missing data.
 */
export function formatLastLogin(value) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Maps one API user onto the props the users table and cards render.
 *
 * `activeTrips` is a real count since Trips (#11) shipped. `activeLeads`,
 * `conversionRate` and `revenue` are not on this endpoint (the Agents roster
 * carries the lead figures), so they render as an em dash rather than a zero.
 */
export function toTeamMember(user) {
  return {
    id: user?.id,
    name: getFullName(user),
    email: user?.email,
    phone: user?.phone ?? null,
    role: user?.role,
    roleLabel: formatUserRole(user?.role),
    permissionLevel: user?.permissionLevel ?? "—",
    status: formatUserStatus(user?.status),
    rawStatus: user?.status,
    lastLogin: formatLastLogin(user?.lastLoginAt),
    twoFactorEnabled: Boolean(user?.twoFactorEnabled),

    // Audit trail, present on every record in every module.
    createdAt: user?.createdAt ?? null,
    updatedAt: user?.updatedAt ?? null,

    // No archive trail here, unlike the other modules: staff accounts are
    // never removed, so there is nothing to have been restored from.

    // A referral agent's standard commission (#11) — null for everyone else,
    // and for an agent whose terms are not set. Formatted with
    // `formatStructure` from `@/lib/commission` where it is shown.
    commissionBasis: user?.commissionBasis ?? null,
    commissionPercentage: user?.commissionPercentage ?? null,
    commissionAmount: user?.commissionAmount ?? null,

    activeLeads: "—",
    activeTrips: user?.activeTrips ?? "—",
    conversionRate: "—",
    revenue: "—",
  };
}

export function formatUserRole(role) {
  if (!role) return "";
  return ROLE_LABELS[role] ?? role;
}

export function getFullName(user) {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  return name || user?.email || "";
}

/**
 * Maps the API's user onto the props the nav components render.
 *
 * Both the top-nav menu and the sidebar footer show the same identity, so the
 * mapping lives here rather than being re-derived in each.
 */
export function toDisplayUser(user, { isLoading = false } = {}) {
  return {
    // Placeholder only while the first request is in flight, so the nav does
    // not collapse to an empty row on load.
    name: isLoading ? "Loading…" : getFullName(user),
    role: formatUserRole(user?.role),
    // An upload URL is relative; this is where it becomes loadable.
    avatarUrl: uploadUrl(user?.avatarUrl),
  };
}

export function getInitials(user) {
  const first = user?.firstName?.[0] ?? "";
  const last = user?.lastName?.[0] ?? "";
  return (first + last).toUpperCase() || user?.email?.[0]?.toUpperCase() || "";
}
