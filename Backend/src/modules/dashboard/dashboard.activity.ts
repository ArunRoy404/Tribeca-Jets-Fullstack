import { Permission, Scope, scopeFor } from '../../common/authorization/permissions.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import type { Prisma } from '../../generated/prisma/client.js';

/**
 * Who sees which entries on the dashboard's Recent Activity (#24).
 *
 * An audit row is about a record, so it is readable exactly when that kind
 * of record is: each entity type maps to the permission that governs reading
 * it. A role that reaches every row of that kind (ALL, or READ on reference
 * data) sees everybody's activity on it; a role scoped to its own rows sees
 * only what it did itself — which it saw, because it did it. So a broker's
 * feed can never name a client or a trip the broker could not open.
 *
 * An entity type missing from this map is never shown: a new module fails
 * closed until somebody decides who may watch it.
 */
export const ACTIVITY_PERMISSION: Record<string, Permission> = {
  Trip: Permission.VIEW_TRIPS,
  TripLeg: Permission.VIEW_TRIPS,
  Itinerary: Permission.VIEW_TRIPS,
  Quote: Permission.VIEW_TRIPS,
  TripRequest: Permission.VIEW_TRIPS,
  Client: Permission.VIEW_CLIENTS,
  ClientCredit: Permission.VIEW_CLIENTS,
  Note: Permission.VIEW_CLIENTS,
  OperatorQuote: Permission.OPERATOR_SOURCING,
  EmptyLeg: Permission.OPERATOR_SOURCING,
  Invoice: Permission.VIEW_RECEIVABLES,
  OperatorPayable: Permission.VIEW_OPERATOR_PAYMENTS,
  Commission: Permission.VIEW_COMMISSIONS,
  Referral: Permission.VIEW_REFERRALS,
  ReferralResource: Permission.VIEW_REFERRALS,
  Task: Permission.VIEW_TASKS,
  EmailTemplate: Permission.MANAGE_EMAIL_TEMPLATES,
  Operator: Permission.MANAGE_OPERATORS,
  Aircraft: Permission.MANAGE_AIRCRAFT,
  Airport: Permission.MANAGE_AIRPORTS,
  CharterRate: Permission.VIEW_FINANCIALS,
  User: Permission.MANAGE_USERS,
  Upload: Permission.MANAGE_USERS,
};

/** Every scope that reaches all rows of a kind. */
const REACHES_ALL: Scope[] = [Scope.ALL, Scope.READ];

/**
 * The feed's `where`. Sign-ins and password resets are never desk activity
 * (they carry IP addresses and nothing anyone works). An email is recorded
 * once per record it was about; the trip's copy is dropped here so one email
 * is one line, under the person it went to.
 */
export function activityWhere(user: AuthenticatedUser): Prisma.AuditLogWhereInput {
  const kinds: Prisma.AuditLogWhereInput[] = [];
  for (const [entityType, permission] of Object.entries(ACTIVITY_PERMISSION)) {
    const scope = scopeFor(user.role, permission);
    if (scope === Scope.NONE) continue;
    kinds.push(REACHES_ALL.includes(scope) ? { entityType } : { entityType, actorId: user.id });
  }
  return {
    AND: [
      { OR: kinds.length ? kinds : [{ id: { in: [] } }] },
      { NOT: { action: { startsWith: 'auth.' } } },
      { NOT: { AND: [{ action: { startsWith: 'email.' } }, { entityType: 'Trip' }] } },
    ],
  };
}
