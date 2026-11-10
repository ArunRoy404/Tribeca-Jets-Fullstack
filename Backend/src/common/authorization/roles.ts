import { UserRole } from '../../generated/prisma/enums.js';

/**
 * Who someone *is*, as opposed to what they may do.
 *
 * What a person may do is their own permission set (`access.catalogue.ts`,
 * `access.roles.ts`, `access.ts`). The old role matrix that used to live
 * beside these helpers, in `permissions.ts`, was deleted on 10 Nov 2026 once
 * the last route moved off it. What remains is identity — "is this an
 * administrator", "is this a partner" — read from the stored role, and the
 * role list and labels the Users & Roles screen shows.
 *
 * Never use these for authority: "only an administrator can X" is an action
 * in the catalogue the Admin role holds by default (AGENTS.md).
 */

/** Roles an administrator may actually assign — SUPER_ADMIN is never offered. */
export const ASSIGNABLE_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.BROKER,
  UserRole.ASSISTANT,
  UserRole.REFERRAL_AGENT,
];

/**
 * Whether this caller is an outside partner rather than desk staff.
 *
 * A referral agent's per-person permissions already exclude every desk
 * module; this exists for the rules that are about *who someone is* rather
 * than what they were granted — `@StaffOnly()`, uploads, notes — and must
 * hold whatever a permission set says.
 */
export function isPartner(role: UserRole): boolean {
  return role === UserRole.REFERRAL_AGENT;
}

/**
 * Whether this role administers the company: SUPER_ADMIN or ADMIN.
 *
 * Identity, like `isPartner`. Used where "an administrator" is the rule
 * itself — every stored file is readable by one, and the last active one
 * cannot be removed — rather than a capability a person is granted.
 */
export function isAdministrator(role: UserRole): boolean {
  return role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN;
}

/**
 * Human-readable labels for the roles screen. Kept beside the role list so a
 * new role cannot be added without someone deciding how to describe it.
 */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]:
    'Owner account. Full administration, and cannot be demoted, suspended or removed.',
  [UserRole.ADMIN]:
    'Full system administration: every module, every record, user management and financial exports.',
  [UserRole.BROKER]:
    'Their own trips, quotes and requests and their assigned clients. No company-wide figures.',
  [UserRole.ASSISTANT]:
    'Supports the desk on the trips and clients assigned to them. No financial figures.',
  [UserRole.REFERRAL_AGENT]:
    'Outside partner. Partner portal only: submit referrals, follow their status, see their own commissions and the resources library.',
};

/** The coarse label the Users table shows in its "Permission Level" column. */
export const ROLE_PERMISSION_LEVEL: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'Owner',
  [UserRole.ADMIN]: 'Admin',
  [UserRole.BROKER]: 'Medium',
  [UserRole.ASSISTANT]: 'Low',
  [UserRole.REFERRAL_AGENT]: 'Partner',
};
