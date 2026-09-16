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
  },
  [Permission.VIEW_TRIPS]: {
    [UserRole.SUPER_ADMIN]: ALL,
    [UserRole.ADMIN]: ALL,
    [UserRole.SENIOR_BROKER]: ALL,
    [UserRole.BROKER]: OWN,
    [UserRole.ASSISTANT]: ASSIGNED,
  },
  [Permission.MANAGE_TRIPS]: {
    [UserRole.SUPER_ADMIN]: ALL,
    [UserRole.ADMIN]: ALL,
    [UserRole.SENIOR_BROKER]: ALL,
    [UserRole.BROKER]: OWN,
    [UserRole.ASSISTANT]: NONE,
  },
  [Permission.DELETE_TRIPS]: {
    [UserRole.SUPER_ADMIN]: ALL,
    [UserRole.ADMIN]: ALL,
    [UserRole.SENIOR_BROKER]: NONE,
    [UserRole.BROKER]: NONE,
    [UserRole.ASSISTANT]: NONE,
  },
  [Permission.VIEW_FINANCIALS]: {
    [UserRole.SUPER_ADMIN]: ALL,
    [UserRole.ADMIN]: ALL,
    [UserRole.SENIOR_BROKER]: ALL,
    [UserRole.BROKER]: OWN,
    [UserRole.ASSISTANT]: NONE,
  },
  [Permission.EXPORT_DATA]: {
    [UserRole.SUPER_ADMIN]: ALL,
    [UserRole.ADMIN]: ALL,
    [UserRole.SENIOR_BROKER]: ALL,
    [UserRole.BROKER]: NONE,
    [UserRole.ASSISTANT]: NONE,
  },
  [Permission.MANAGE_USERS]: {
    [UserRole.SUPER_ADMIN]: ALL,
    [UserRole.ADMIN]: ALL,
    [UserRole.SENIOR_BROKER]: NONE,
    [UserRole.BROKER]: NONE,
    [UserRole.ASSISTANT]: NONE,
  },
  [Permission.OPERATOR_SOURCING]: {
    [UserRole.SUPER_ADMIN]: ALL,
    [UserRole.ADMIN]: ALL,
    [UserRole.SENIOR_BROKER]: ALL,
    [UserRole.BROKER]: ALL,
    [UserRole.ASSISTANT]: READ,
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
  },
  [Permission.MANAGE_CLIENTS]: {
    [UserRole.SUPER_ADMIN]: ALL,
    [UserRole.ADMIN]: ALL,
    [UserRole.SENIOR_BROKER]: ALL,
    [UserRole.BROKER]: ASSIGNED,
    [UserRole.ASSISTANT]: NONE,
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
  },
  [Permission.MANAGE_OPERATORS]: {
    [UserRole.SUPER_ADMIN]: ALL,
    [UserRole.ADMIN]: ALL,
    [UserRole.SENIOR_BROKER]: ALL,
    // A broker who sources a new operator adds it themselves; matching
    // OPERATOR_SOURCING, which already grants them ALL.
    [UserRole.BROKER]: ALL,
    [UserRole.ASSISTANT]: READ,
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
];

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
};

/** The coarse label the Users table shows in its "Permission Level" column. */
export const ROLE_PERMISSION_LEVEL: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'Owner',
  [UserRole.ADMIN]: 'Admin',
  [UserRole.SENIOR_BROKER]: 'High',
  [UserRole.BROKER]: 'Medium',
  [UserRole.ASSISTANT]: 'Low',
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
};
