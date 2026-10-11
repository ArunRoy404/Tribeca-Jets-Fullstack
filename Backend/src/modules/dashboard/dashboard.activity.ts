import { Action, Module, Reach, canDo, reachOf } from '../../common/authorization/access.js';
import { isAdministrator } from '../../common/authorization/permissions.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import type { Prisma } from '../../generated/prisma/client.js';

/**
 * Who sees which entries on the dashboard's Recent Activity (#24 / #30).
 *
 * An audit row is about a record, so it is readable exactly when that kind
 * of record is: each entity type maps to the module that governs reading
 * it. A role that reaches every row of that kind (Reach.ALL, or an administrator)
 * sees everybody's activity on it; a user scoped to their own rows sees
 * only what they did themselves. So a broker's feed can never name a client
 * or a trip the broker could not open.
 *
 * An entity type missing from this map is never shown: a new module fails
 * closed until somebody decides who may watch it.
 */
export const ACTIVITY_MODULE: Record<string, Module> = {
  Trip: Module.TRIPS,
  TripLeg: Module.TRIPS,
  Itinerary: Module.ITINERARIES,
  Quote: Module.QUOTES,
  TripRequest: Module.TRIP_REQUESTS,
  Client: Module.CLIENTS,
  ClientCredit: Module.CLIENTS,
  Note: Module.CLIENTS,
  OperatorQuote: Module.OPERATOR_SOURCING,
  EmptyLeg: Module.EMPTY_LEGS,
  Invoice: Module.RECEIVABLES,
  OperatorPayable: Module.OPERATOR_PAYMENTS,
  Commission: Module.COMMISSIONS,
  Referral: Module.REFERRALS,
  ReferralResource: Module.REFERRALS,
  Task: Module.TASKS,
  EmailTemplate: Module.EMAIL_TEMPLATES,
  Operator: Module.OPERATORS,
  Aircraft: Module.AIRCRAFT,
  Airport: Module.AIRPORTS,
  CharterRate: Module.QUOTES,
  User: Module.USERS,
  Upload: Module.USERS,
};

/**
 * The feed's `where`. Sign-ins and password resets are never desk activity
 * (they carry IP addresses and nothing anyone works). An email is recorded
 * once per record it was about; the trip's copy is dropped here so one email
 * is one line, under the person it went to.
 */
export function activityWhere(user: AuthenticatedUser): Prisma.AuditLogWhereInput {
  const kinds: Prisma.AuditLogWhereInput[] = [];
  const isAdmin = isAdministrator(user.role);

  for (const [entityType, module] of Object.entries(ACTIVITY_MODULE)) {
    if (!isAdmin && !canDo(user.access, module, Action.VIEW)) continue;
    const reach = isAdmin ? Reach.ALL : reachOf(user.access, module);
    kinds.push(reach === Reach.ALL ? { entityType } : { entityType, actorId: user.id });
  }

  return {
    AND: [
      { OR: kinds.length ? kinds : [{ id: { in: [] } }] },
      { NOT: { action: { startsWith: 'auth.' } } },
      { NOT: { AND: [{ action: { startsWith: 'email.' } }, { entityType: 'Trip' }] } },
    ],
  };
}
