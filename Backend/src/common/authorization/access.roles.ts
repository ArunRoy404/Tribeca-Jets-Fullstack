import { UserRole } from '../../generated/prisma/enums.js';
import { Action, MODULES, Module, Reach } from './access.catalogue.js';

/**
 * What each role may hold, module by module (owner's design, 7 Oct 2026).
 *
 * - **reach** — how far the role's actions go. Fixed: an administrator never
 *   edits it per person ("a broker sees only their own" is the role, not a
 *   checkbox).
 * - **defaults** — what a new account of this role starts with.
 * - **optional** — what an administrator may add for one person on top.
 *
 * Anything else is **locked**: the role can never hold it, whatever the form
 * sends. A module absent from a role is locked whole. The scope document
 * (§4) drives the shape — an administrator sees the whole business, a broker
 * only their assigned clients and trips with no company-wide numbers, and
 * the assistant's matrix was left open (§17), so theirs is a working draft.
 *
 * SUPER_ADMIN is not here: it holds every action at ALL and is never edited.
 */
export interface RoleGrant {
  reach: Reach;
  defaults: Action[];
  optional: Action[];
}

type RoleGrants = Partial<Record<Module, RoleGrant>>;

const { OWN, ASSIGNED, ALL } = Reach;
const { VIEW, CREATE, EDIT, ARCHIVE, ASSIGN, SEND, PAY, EXPORT, VIEW_MONEY, VIEW_SENSITIVE } = Action;

const grant = (reach: Reach, defaults: Action[], optional: Action[] = []): RoleGrant => ({
  reach,
  defaults,
  optional,
});

/** An administrator: every module, every action, every record. */
const ADMIN_GRANTS: RoleGrants = Object.fromEntries(
  MODULES.map((m) => [m.module, grant(ALL, [...m.actions])]),
);

const BROKER_GRANTS: RoleGrants = {
  [Module.DASHBOARD]: grant(OWN, [VIEW, VIEW_MONEY]),
  [Module.TRIPS]: grant(OWN, [VIEW, CREATE, EDIT, VIEW_MONEY], [ARCHIVE]),
  [Module.SCHEDULE]: grant(OWN, [VIEW]),
  [Module.OPERATOR_SOURCING]: grant(OWN, [VIEW, CREATE, EDIT], [ARCHIVE]),
  [Module.FLIGHT_TRACKING]: grant(OWN, [VIEW, EDIT]),
  [Module.ITINERARIES]: grant(OWN, [VIEW, CREATE, EDIT, SEND]),
  [Module.EMPTY_LEGS]: grant(ALL, [VIEW, CREATE, EDIT], [ARCHIVE]),
  // Reassigning a client is a desk-management call (scope §4: no access to
  // other brokers' clients), so ASSIGN is locked for every broker.
  [Module.CLIENTS]: grant(ASSIGNED, [VIEW, CREATE, EDIT], [ARCHIVE]),
  [Module.LEADS_AGENTS]: grant(ASSIGNED, [VIEW, CREATE, EDIT], [ARCHIVE]),
  [Module.TRIP_REQUESTS]: grant(OWN, [VIEW, CREATE, EDIT], [ARCHIVE]),
  [Module.REFERRALS]: grant(OWN, [VIEW, EDIT], [CREATE, ARCHIVE]),
  [Module.QUOTES]: grant(OWN, [VIEW, CREATE, EDIT, SEND, VIEW_MONEY], [ARCHIVE]),
  [Module.EMAIL_TEMPLATES]: grant(ALL, [VIEW, SEND], [CREATE, EDIT, ARCHIVE]),
  [Module.OPERATORS]: grant(ALL, [VIEW, CREATE, EDIT], [ARCHIVE]),
  [Module.AIRCRAFT]: grant(ALL, [VIEW, CREATE, EDIT], [ARCHIVE]),
  [Module.AIRPORTS]: grant(ALL, [VIEW], [CREATE, EDIT]),
  [Module.DOCUMENTS]: grant(OWN, [VIEW, CREATE, EDIT, VIEW_SENSITIVE], [ARCHIVE]),
  [Module.RECEIVABLES]: grant(OWN, [VIEW, CREATE, PAY], [EXPORT]),
  [Module.OPERATOR_PAYMENTS]: grant(OWN, [VIEW], [CREATE, PAY]),
  // A broker never raises or pays their own commission.
  [Module.COMMISSIONS]: grant(OWN, [VIEW]),
  [Module.TRANSACTIONS]: grant(OWN, [VIEW], [EXPORT]),
  [Module.REPORTS]: grant(OWN, [VIEW], [EXPORT]),
  [Module.TASKS]: grant(OWN, [VIEW, CREATE, EDIT], [ASSIGN, ARCHIVE]),
  // The Users & Roles screen, read-only at most. Inviting, editing and
  // changing access stay with administrators.
  [Module.USERS]: grant(ALL, [], [VIEW]),
};

/** A working draft — the scope leaves the assistant's matrix open (§17). */
const ASSISTANT_GRANTS: RoleGrants = {
  [Module.DASHBOARD]: grant(ASSIGNED, [VIEW]),
  [Module.TRIPS]: grant(ASSIGNED, [VIEW], [CREATE, EDIT]),
  [Module.SCHEDULE]: grant(ASSIGNED, [VIEW]),
  [Module.OPERATOR_SOURCING]: grant(ASSIGNED, [VIEW], [CREATE, EDIT]),
  [Module.FLIGHT_TRACKING]: grant(ASSIGNED, [VIEW, EDIT]),
  [Module.ITINERARIES]: grant(ASSIGNED, [VIEW], [CREATE, EDIT, SEND]),
  [Module.EMPTY_LEGS]: grant(ALL, [VIEW], [CREATE, EDIT]),
  [Module.CLIENTS]: grant(ASSIGNED, [VIEW], [CREATE, EDIT]),
  [Module.LEADS_AGENTS]: grant(ASSIGNED, [VIEW], [CREATE, EDIT]),
  [Module.TRIP_REQUESTS]: grant(ASSIGNED, [VIEW], [CREATE, EDIT]),
  [Module.QUOTES]: grant(ASSIGNED, [VIEW], [CREATE, EDIT, SEND]),
  [Module.EMAIL_TEMPLATES]: grant(ALL, [VIEW, SEND], [CREATE, EDIT]),
  [Module.OPERATORS]: grant(ALL, [VIEW], [CREATE, EDIT]),
  [Module.AIRCRAFT]: grant(ALL, [VIEW], [CREATE, EDIT]),
  [Module.AIRPORTS]: grant(ALL, [VIEW], [CREATE, EDIT]),
  [Module.DOCUMENTS]: grant(ASSIGNED, [VIEW], [CREATE, VIEW_SENSITIVE]),
  [Module.TASKS]: grant(OWN, [VIEW, CREATE, EDIT]),
  [Module.USERS]: grant(ALL, [], [VIEW]),
};

/**
 * An outside partner (client adjustment #11). The partner portal and nothing
 * of the CRM: their own referrals and their own commissions. Locked out of
 * every staff module whatever an administrator ticks.
 */
const REFERRAL_AGENT_GRANTS: RoleGrants = {
  [Module.REFERRALS]: grant(OWN, [VIEW, CREATE]),
  [Module.COMMISSIONS]: grant(OWN, [VIEW]),
};

export const ROLE_GRANTS: Record<Exclude<UserRole, 'SUPER_ADMIN'>, RoleGrants> = {
  [UserRole.ADMIN]: ADMIN_GRANTS,
  [UserRole.BROKER]: BROKER_GRANTS,
  [UserRole.ASSISTANT]: ASSISTANT_GRANTS,
  [UserRole.REFERRAL_AGENT]: REFERRAL_AGENT_GRANTS,
};
