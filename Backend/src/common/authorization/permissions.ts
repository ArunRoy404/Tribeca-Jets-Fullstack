import { UserRole } from '../../generated/prisma/enums.js';

/**
 * The authorization vocabulary.
 *
 * This file is the single source of truth for who can do what. It mirrors the
 * "Role Permission Matrix" on the Users & Roles screen exactly — if the table
 * in the UI and the matrix below ever disagree, the matrix wins and the UI is
 * wrong, because this is what actually runs.
 *
 * Adding a capability means adding a `Permission` here and a row to
 * `PERMISSION_MATRIX`. It never means writing an ad-hoc role list on a
 * controller: a role list scattered across controllers cannot be audited, and
 * cannot be rendered back to an administrator as a matrix.
 */
export const Permission = {
  VIEW_DASHBOARD: 'VIEW_DASHBOARD',
  VIEW_TRIPS: 'VIEW_TRIPS',
  MANAGE_TRIPS: 'MANAGE_TRIPS',
  DELETE_TRIPS: 'DELETE_TRIPS',
  VIEW_FINANCIALS: 'VIEW_FINANCIALS',
  EXPORT_DATA: 'EXPORT_DATA',
  MANAGE_USERS: 'MANAGE_USERS',
  OPERATOR_SOURCING: 'OPERATOR_SOURCING',
  VIEW_CLIENTS: 'VIEW_CLIENTS',
  MANAGE_CLIENTS: 'MANAGE_CLIENTS',
  MANAGE_AIRPORTS: 'MANAGE_AIRPORTS',
  MANAGE_OPERATORS: 'MANAGE_OPERATORS',
  MANAGE_AIRCRAFT: 'MANAGE_AIRCRAFT',
  VIEW_COMMISSIONS: 'VIEW_COMMISSIONS',
  MANAGE_COMMISSIONS: 'MANAGE_COMMISSIONS',
  VIEW_REFERRALS: 'VIEW_REFERRALS',
  MANAGE_REFERRALS: 'MANAGE_REFERRALS',
  VIEW_TEAM: 'VIEW_TEAM',
  VIEW_RECEIVABLES: 'VIEW_RECEIVABLES',
  MANAGE_RECEIVABLES: 'MANAGE_RECEIVABLES',
  VIEW_OPERATOR_PAYMENTS: 'VIEW_OPERATOR_PAYMENTS',
  MANAGE_OPERATOR_PAYMENTS: 'MANAGE_OPERATOR_PAYMENTS',
  VIEW_TASKS: 'VIEW_TASKS',
  MANAGE_TASKS: 'MANAGE_TASKS',
  MANAGE_EMAIL_TEMPLATES: 'MANAGE_EMAIL_TEMPLATES',
  SEND_EMAILS: 'SEND_EMAILS',
  VIEW_DOCUMENTS: 'VIEW_DOCUMENTS',
  MANAGE_DOCUMENTS: 'MANAGE_DOCUMENTS',
  VIEW_SENSITIVE_DOCUMENTS: 'VIEW_SENSITIVE_DOCUMENTS',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

/**
 * How much a role may reach, not merely whether it may act.
 *
 * The distinction matters because most of this product's authorization is
 * row-level: a broker is allowed to view trips, but only their own. Encoding
 * that as a boolean would force every caller to re-derive the scope from the
 * role, and they would drift.
 */
export const Scope = {
  /** No access. The guard rejects the request outright. */
  NONE: 'NONE',
  /** May read, may not modify. */
  READ: 'READ',
  /** Only rows explicitly assigned to this user. */
  ASSIGNED: 'ASSIGNED',
  /** Only rows this user owns or originated. */
  OWN: 'OWN',
  /** Every row. */
  ALL: 'ALL',
} as const;

export type Scope = (typeof Scope)[keyof typeof Scope];

const { NONE, READ, ASSIGNED, OWN, ALL } = Scope;

type RoleScopes = Record<UserRole, Scope>;

/**
 * SUPER_ADMIN is intentionally identical to ADMIN here. Its extra power is not
 * a capability but an immunity — it cannot be demoted, suspended or deleted
 * (see UsersService) — so it needs no distinct row.
 */
const PERMISSION_MATRIX: Record<Permission, RoleScopes> = {
  [Permission.VIEW_DASHBOARD]: {
    [UserRole.SUPER_ADMIN]: ALL,
    [UserRole.ADMIN]: ALL,
    [UserRole.SENIOR_BROKER]: ALL,
    [UserRole.BROKER]: ALL,
    [UserRole.ASSISTANT]: ALL,
    [UserRole.REFERRAL_AGENT]: NONE,
  },
  [Permission.VIEW_TRIPS]: {
    [UserRole.SUPER_ADMIN]: ALL,
    [UserRole.ADMIN]: ALL,
    [UserRole.SENIOR_BROKER]: ALL,
    [UserRole.BROKER]: OWN,
    [UserRole.ASSISTANT]: ASSIGNED,
    [UserRole.REFERRAL_AGENT]: NONE,
  },
  [Permission.MANAGE_TRIPS]: {
    [UserRole.SUPER_ADMIN]: ALL,
    [UserRole.ADMIN]: ALL,
    [UserRole.SENIOR_BROKER]: ALL,
    [UserRole.BROKER]: OWN,
    [UserRole.ASSISTANT]: NONE,
    [UserRole.REFERRAL_AGENT]: NONE,
  },
  [Permission.DELETE_TRIPS]: {
    [UserRole.SUPER_ADMIN]: ALL,
    [UserRole.ADMIN]: ALL,
    [UserRole.SENIOR_BROKER]: NONE,
    [UserRole.BROKER]: NONE,
    [UserRole.ASSISTANT]: NONE,
    [UserRole.REFERRAL_AGENT]: NONE,
  },
  [Permission.VIEW_FINANCIALS]: {
    [UserRole.SUPER_ADMIN]: ALL,
    [UserRole.ADMIN]: ALL,
    [UserRole.SENIOR_BROKER]: ALL,
    [UserRole.BROKER]: OWN,
    [UserRole.ASSISTANT]: NONE,
    [UserRole.REFERRAL_AGENT]: NONE,
  },
  [Permission.EXPORT_DATA]: {
    [UserRole.SUPER_ADMIN]: ALL,
    [UserRole.ADMIN]: ALL,
    [UserRole.SENIOR_BROKER]: ALL,
    [UserRole.BROKER]: NONE,
    [UserRole.ASSISTANT]: NONE,
    [UserRole.REFERRAL_AGENT]: NONE,
  },
  [Permission.MANAGE_USERS]: {
    [UserRole.SUPER_ADMIN]: ALL,
    [UserRole.ADMIN]: ALL,
    [UserRole.SENIOR_BROKER]: NONE,
    [UserRole.BROKER]: NONE,
    [UserRole.ASSISTANT]: NONE,
    [UserRole.REFERRAL_AGENT]: NONE,
  },
  [Permission.OPERATOR_SOURCING]: {
    [UserRole.SUPER_ADMIN]: ALL,
    [UserRole.ADMIN]: ALL,
    [UserRole.SENIOR_BROKER]: ALL,
    [UserRole.BROKER]: ALL,
    [UserRole.ASSISTANT]: READ,
    [UserRole.REFERRAL_AGENT]: NONE,
  },
  /**
   * Clients are not on the UI matrix yet. They follow the trips rules, which
   * is what the Clients module already enforces in its service layer: a broker
   * sees the clients assigned to them.
   */
  [Permission.VIEW_CLIENTS]: {
    [UserRole.SUPER_ADMIN]: ALL,
    [UserRole.ADMIN]: ALL,
    [UserRole.SENIOR_BROKER]: ALL,
    [UserRole.BROKER]: ASSIGNED,
    [UserRole.ASSISTANT]: ASSIGNED,
    [UserRole.REFERRAL_AGENT]: NONE,
  },
  [Permission.MANAGE_CLIENTS]: {
    [UserRole.SUPER_ADMIN]: ALL,
    [UserRole.ADMIN]: ALL,
    [UserRole.SENIOR_BROKER]: ALL,
    [UserRole.BROKER]: ASSIGNED,
    [UserRole.ASSISTANT]: NONE,
    [UserRole.REFERRAL_AGENT]: NONE,
  },
  /**
   * Reference data: shared by the whole desk and owned by nobody, so there is
   * no row-level scope to express — only whether you may edit the master list.
   *
   * READ is doing real work in both rows below. Everyone needs to *read* these
   * tables (a broker cannot build a trip without picking an airport), so a
   * second VIEW_ permission would be a permission that is never denied. `READ`
   * on the manage permission says exactly that: yours to read, not to change.
   */
  [Permission.MANAGE_AIRPORTS]: {
    [UserRole.SUPER_ADMIN]: ALL,
    [UserRole.ADMIN]: ALL,
    [UserRole.SENIOR_BROKER]: ALL,
    // Airports are objective facts about the world, not desk opinion. A wrong
    // runway length silently makes a trip unbookable, so editing the list is
    // deliberately narrower than editing an operator.
    [UserRole.BROKER]: READ,
    [UserRole.ASSISTANT]: READ,
    // The Submit Referral form picks its departure and arrival airports from
    // this list. Airports are public facts; nothing here is desk data.
    [UserRole.REFERRAL_AGENT]: READ,
  },
  [Permission.MANAGE_OPERATORS]: {
    [UserRole.SUPER_ADMIN]: ALL,
    [UserRole.ADMIN]: ALL,
    [UserRole.SENIOR_BROKER]: ALL,
    // A broker who sources a new operator adds it themselves; matching
    // OPERATOR_SOURCING, which already grants them ALL.
    [UserRole.BROKER]: ALL,
    [UserRole.ASSISTANT]: READ,
    [UserRole.REFERRAL_AGENT]: NONE,
  },
  /**
   * The fleet follows the operators row above, because the two are catalogued
   * in the same conversation: a broker sourcing a tail nobody has entered yet
   * adds the operator and the airframe together, and a permission that let
   * them do one but not the other would just produce operators with no fleet.
   */
  [Permission.MANAGE_AIRCRAFT]: {
    [UserRole.SUPER_ADMIN]: ALL,
    [UserRole.ADMIN]: ALL,
    [UserRole.SENIOR_BROKER]: ALL,
    [UserRole.BROKER]: ALL,
    [UserRole.ASSISTANT]: READ,
    [UserRole.REFERRAL_AGENT]: NONE,
  },
  /**
   * Commissions (#11's Commission Center, scope §6.12). OWN means a different
   * column per role, resolved in `CommissionsService`: a broker sees the
   * commissions booked against them, a referral agent the ones paid to them.
   * Recording and paying one is an administrator's or senior broker's call —
   * it is money leaving the company.
   */
  [Permission.VIEW_COMMISSIONS]: {
    [UserRole.SUPER_ADMIN]: ALL,
    [UserRole.ADMIN]: ALL,
    [UserRole.SENIOR_BROKER]: ALL,
    [UserRole.BROKER]: OWN,
    [UserRole.ASSISTANT]: NONE,
    [UserRole.REFERRAL_AGENT]: OWN,
  },
  [Permission.MANAGE_COMMISSIONS]: {
    [UserRole.SUPER_ADMIN]: ALL,
    [UserRole.ADMIN]: ALL,
    [UserRole.SENIOR_BROKER]: ALL,
    [UserRole.BROKER]: NONE,
    [UserRole.ASSISTANT]: NONE,
    [UserRole.REFERRAL_AGENT]: NONE,
  },
  /**
   * Portal referrals (#11). A broker sees the referrals assigned to them and
   * the unassigned ones — the same rule as trip requests, so a new referral
   * cannot sit unseen. A referral agent's OWN is "I submitted it", and their
   * MANAGE is submitting only: every later change is the desk's, enforced in
   * `ReferralsService`.
   */
  [Permission.VIEW_REFERRALS]: {
    [UserRole.SUPER_ADMIN]: ALL,
    [UserRole.ADMIN]: ALL,
    [UserRole.SENIOR_BROKER]: ALL,
    [UserRole.BROKER]: OWN,
    [UserRole.ASSISTANT]: NONE,
    [UserRole.REFERRAL_AGENT]: OWN,
  },
  [Permission.MANAGE_REFERRALS]: {
    [UserRole.SUPER_ADMIN]: ALL,
    [UserRole.ADMIN]: ALL,
    [UserRole.SENIOR_BROKER]: ALL,
    [UserRole.BROKER]: OWN,
    [UserRole.ASSISTANT]: NONE,
    [UserRole.REFERRAL_AGENT]: OWN,
  },
  /**
   * The staff directory — `GET /users`, the pickers every form needs, the
   * roles screen. Every desk role reads it; a referral agent does not, which
   * is #11's "no access to other referral agents" as a matrix row rather than
   * an `if` in a service.
   */
  [Permission.VIEW_TEAM]: {
    [UserRole.SUPER_ADMIN]: ALL,
    [UserRole.ADMIN]: ALL,
    [UserRole.SENIOR_BROKER]: ALL,
    [UserRole.BROKER]: ALL,
    [UserRole.ASSISTANT]: ALL,
    [UserRole.REFERRAL_AGENT]: NONE,
  },
  /**
   * Receivables (#16) — client invoices and the payments against them. OWN is
   * "invoices on a trip I may see", resolved through `TripsService`, so a
   * broker works the billing on their own bookings and the unassigned ones,
   * exactly as they work the trips. Unlike commissions this is money coming
   * *in*, so the broker who booked the flight records its wire.
   *
   * Archiving an invoice or withdrawing a payment is finer than this row —
   * ALL only, enforced in `ReceivablesService`, the same split clients make.
   */
  [Permission.VIEW_RECEIVABLES]: {
    [UserRole.SUPER_ADMIN]: ALL,
    [UserRole.ADMIN]: ALL,
    [UserRole.SENIOR_BROKER]: ALL,
    [UserRole.BROKER]: OWN,
    [UserRole.ASSISTANT]: NONE,
    [UserRole.REFERRAL_AGENT]: NONE,
  },
  [Permission.MANAGE_RECEIVABLES]: {
    [UserRole.SUPER_ADMIN]: ALL,
    [UserRole.ADMIN]: ALL,
    [UserRole.SENIOR_BROKER]: ALL,
    [UserRole.BROKER]: OWN,
    [UserRole.ASSISTANT]: NONE,
    [UserRole.REFERRAL_AGENT]: NONE,
  },
  /**
   * Operator Payments (#17) — what Tribeca owes operators and has sent them.
   * A broker reads the payables on the trips they may see (OWN, through
   * `TripsService`), because the operator's bill is part of working the trip.
   * Recording and sending money is money *leaving* the company, so — as with
   * commissions — only administrators and senior brokers write.
   */
  [Permission.VIEW_OPERATOR_PAYMENTS]: {
    [UserRole.SUPER_ADMIN]: ALL,
    [UserRole.ADMIN]: ALL,
    [UserRole.SENIOR_BROKER]: ALL,
    [UserRole.BROKER]: OWN,
    [UserRole.ASSISTANT]: NONE,
    [UserRole.REFERRAL_AGENT]: NONE,
  },
  [Permission.MANAGE_OPERATOR_PAYMENTS]: {
    [UserRole.SUPER_ADMIN]: ALL,
    [UserRole.ADMIN]: ALL,
    [UserRole.SENIOR_BROKER]: ALL,
    [UserRole.BROKER]: NONE,
    [UserRole.ASSISTANT]: NONE,
    [UserRole.REFERRAL_AGENT]: NONE,
  },
  /**
   * Tasks Board (#20) — desk work. OWN is "assigned to me or written by me":
   * a task names a client and a trip in its title, and the desk's whole list
   * in front of every broker would be a client directory by another route.
   * Assistants work tasks like brokers do — it is the part of the desk that
   * is most theirs. Archiving someone else's task is ALL only, enforced in
   * `TasksService`.
   */
  [Permission.VIEW_TASKS]: {
    [UserRole.SUPER_ADMIN]: ALL,
    [UserRole.ADMIN]: ALL,
    [UserRole.SENIOR_BROKER]: ALL,
    [UserRole.BROKER]: OWN,
    [UserRole.ASSISTANT]: OWN,
    [UserRole.REFERRAL_AGENT]: NONE,
  },
  [Permission.MANAGE_TASKS]: {
    [UserRole.SUPER_ADMIN]: ALL,
    [UserRole.ADMIN]: ALL,
    [UserRole.SENIOR_BROKER]: ALL,
    [UserRole.BROKER]: OWN,
    [UserRole.ASSISTANT]: OWN,
    [UserRole.REFERRAL_AGENT]: NONE,
  },
  /**
   * Email Templates (#21) — the desk's shared library. Everyone on staff
   * *uses* it (READ), so a second VIEW_ permission would never be denied —
   * the same reasoning as airports. Changing it is narrower: a template is
   * the company's voice in every client's inbox.
   */
  [Permission.MANAGE_EMAIL_TEMPLATES]: {
    [UserRole.SUPER_ADMIN]: ALL,
    [UserRole.ADMIN]: ALL,
    [UserRole.SENIOR_BROKER]: ALL,
    [UserRole.BROKER]: READ,
    [UserRole.ASSISTANT]: READ,
    [UserRole.REFERRAL_AGENT]: NONE,
  },
  /**
   * Emailing a client or an operator from the CRM. OWN is "about a client I
   * may see" — the client, trip, quote and invoice are each resolved through
   * their own module's scope before anything is sent — and it is also what
   * the sent log shows: emails I sent, or about a client I may see.
   */
  [Permission.SEND_EMAILS]: {
    [UserRole.SUPER_ADMIN]: ALL,
    [UserRole.ADMIN]: ALL,
    [UserRole.SENIOR_BROKER]: ALL,
    [UserRole.BROKER]: OWN,
    [UserRole.ASSISTANT]: OWN,
    [UserRole.REFERRAL_AGENT]: NONE,
  },
  /**
   * Document Vault (#22). Which documents a caller reaches is the *owner's*
   * scope — a broker reads the folders of the clients and trips they may
   * see, through those modules' own rules — so the scope here is the
   * capability, and the row rule lives in `DocumentsService`.
   */
  [Permission.VIEW_DOCUMENTS]: {
    [UserRole.SUPER_ADMIN]: ALL,
    [UserRole.ADMIN]: ALL,
    [UserRole.SENIOR_BROKER]: ALL,
    [UserRole.BROKER]: OWN,
    [UserRole.ASSISTANT]: ASSIGNED,
    [UserRole.REFERRAL_AGENT]: NONE,
  },
  /**
   * Filing, editing and archiving. A broker files on their own clients and
   * trips and archives what they filed; archiving anyone's is ALL. An
   * assistant reads the vault and does not change it.
   */
  [Permission.MANAGE_DOCUMENTS]: {
    [UserRole.SUPER_ADMIN]: ALL,
    [UserRole.ADMIN]: ALL,
    [UserRole.SENIOR_BROKER]: ALL,
    [UserRole.BROKER]: OWN,
    [UserRole.ASSISTANT]: NONE,
    [UserRole.REFERRAL_AGENT]: NONE,
  },
  /**
   * Passports and IDs (scope §11: "Passport/ID documents require restricted
   * access"). Without it they are absent from every list and a 404 when
   * named — to the assistant, not merely hidden.
   */
  [Permission.VIEW_SENSITIVE_DOCUMENTS]: {
    [UserRole.SUPER_ADMIN]: ALL,
    [UserRole.ADMIN]: ALL,
    [UserRole.SENIOR_BROKER]: ALL,
    [UserRole.BROKER]: OWN,
    [UserRole.ASSISTANT]: NONE,
    [UserRole.REFERRAL_AGENT]: NONE,
  },
};

/** How far `role` may reach for `permission`. */
export function scopeFor(role: UserRole, permission: Permission): Scope {
  return PERMISSION_MATRIX[permission]?.[role] ?? NONE;
}

/** Whether `role` may perform `permission` at all, at any scope. */
export function can(role: UserRole, permission: Permission): boolean {
  return scopeFor(role, permission) !== NONE;
}

/**
 * Whether `role` may *modify* through `permission`.
 *
 * READ is a grant for reading and a denial for writing, so a plain `can()`
 * check on a write path would wrongly let an assistant edit operator sourcing.
 */
export function canWrite(role: UserRole, permission: Permission): boolean {
  const scope = scopeFor(role, permission);
  return scope !== NONE && scope !== READ;
}

/** Every permission granted to a role, for `/auth/me` and the roles screen. */
export function permissionsFor(role: UserRole): Record<Permission, Scope> {
  const result = {} as Record<Permission, Scope>;
  for (const permission of Object.values(Permission)) {
    result[permission] = scopeFor(role, permission);
  }
  return result;
}

/** Roles an administrator may actually assign — SUPER_ADMIN is never offered. */
export const ASSIGNABLE_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.SENIOR_BROKER,
  UserRole.BROKER,
  UserRole.ASSISTANT,
  UserRole.REFERRAL_AGENT,
];

/**
 * Whether this caller is an outside partner rather than desk staff.
 *
 * The permission matrix already denies a referral agent everything outside
 * the portal; this exists for the few routes that carry no permission
 * decorator by design — uploads and notes — where the rule has to be stated
 * in the service instead.
 */
export function isPartner(role: UserRole): boolean {
  return role === UserRole.REFERRAL_AGENT;
}

/**
 * Human-readable labels for the roles screen. Kept beside the matrix so a new
 * role cannot be added without someone deciding how to describe it.
 */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]:
    'Owner account. Full administration, and cannot be demoted, suspended or removed.',
  [UserRole.ADMIN]:
    'Full system administration, user management, and financial exports.',
  [UserRole.SENIOR_BROKER]:
    'Full trip management, operator sourcing, and team financial visibility.',
  [UserRole.BROKER]:
    'Create and manage own trips, leads, quotes, and operator queries.',
  [UserRole.ASSISTANT]:
    'View assigned trips, flight tracking, and support operational workflows.',
  [UserRole.REFERRAL_AGENT]:
    'Outside partner. Partner portal only: submit referrals, follow their status, see their own commissions and the resources library.',
};

/** The coarse label the Users table shows in its "Permission Level" column. */
export const ROLE_PERMISSION_LEVEL: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'Owner',
  [UserRole.ADMIN]: 'Admin',
  [UserRole.SENIOR_BROKER]: 'High',
  [UserRole.BROKER]: 'Medium',
  [UserRole.ASSISTANT]: 'Low',
  [UserRole.REFERRAL_AGENT]: 'Partner',
};

/** Display labels for the permission rows, in the order the UI lists them. */
export const PERMISSION_LABELS: Record<Permission, string> = {
  [Permission.VIEW_DASHBOARD]: 'View Dashboard',
  [Permission.VIEW_TRIPS]: 'View All Trips',
  [Permission.MANAGE_TRIPS]: 'Create/Edit Trips',
  [Permission.DELETE_TRIPS]: 'Delete Trips',
  [Permission.VIEW_FINANCIALS]: 'View Financials',
  [Permission.EXPORT_DATA]: 'Export Data',
  [Permission.MANAGE_USERS]: 'Manage Users',
  [Permission.OPERATOR_SOURCING]: 'Operator Sourcing',
  [Permission.VIEW_CLIENTS]: 'View Clients',
  [Permission.MANAGE_CLIENTS]: 'Create/Edit Clients',
  [Permission.MANAGE_AIRPORTS]: 'Manage Airports',
  [Permission.MANAGE_OPERATORS]: 'Manage Operators',
  [Permission.MANAGE_AIRCRAFT]: 'Manage Aircraft',
  [Permission.VIEW_COMMISSIONS]: 'View Commissions',
  [Permission.MANAGE_COMMISSIONS]: 'Record/Pay Commissions',
  [Permission.VIEW_REFERRALS]: 'View Referrals',
  [Permission.MANAGE_REFERRALS]: 'Submit/Work Referrals',
  [Permission.VIEW_TEAM]: 'View Team Directory',
  [Permission.VIEW_RECEIVABLES]: 'View Receivables',
  [Permission.MANAGE_RECEIVABLES]: 'Invoice/Record Client Payments',
  [Permission.VIEW_OPERATOR_PAYMENTS]: 'View Operator Payments',
  [Permission.MANAGE_OPERATOR_PAYMENTS]: 'Record/Pay Operator Bills',
  [Permission.VIEW_TASKS]: 'View Tasks',
  [Permission.MANAGE_TASKS]: 'Create/Work Tasks',
  [Permission.MANAGE_EMAIL_TEMPLATES]: 'Manage Email Templates',
  [Permission.SEND_EMAILS]: 'Send Emails',
  [Permission.VIEW_DOCUMENTS]: 'View Documents',
  [Permission.MANAGE_DOCUMENTS]: 'File/Edit Documents',
  [Permission.VIEW_SENSITIVE_DOCUMENTS]: 'View Passports & IDs',
};
