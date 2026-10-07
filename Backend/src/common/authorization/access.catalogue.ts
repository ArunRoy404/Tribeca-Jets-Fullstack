/**
 * The module-and-action permission vocabulary (owner's design, 7 Oct 2026).
 *
 * A permission is a **module** — one per sidebar screen — and an **action**
 * inside it. Each user carries their own set, seeded from their role's
 * defaults and adjusted per person by an administrator; *how far* an action
 * reaches (their own records, the ones assigned to them, or all) is fixed by
 * the role and never edited per person. See `access.roles.ts`.
 *
 * This replaces the coarse `Permission` matrix in `permissions.ts` module by
 * module, as each one is reviewed. Until a module is moved over it is still
 * guarded by the old matrix; a moved module is guarded by `@RequireAccess`.
 */

export const Module = {
  DASHBOARD: 'DASHBOARD',
  TRIPS: 'TRIPS',
  SCHEDULE: 'SCHEDULE',
  OPERATOR_SOURCING: 'OPERATOR_SOURCING',
  FLIGHT_TRACKING: 'FLIGHT_TRACKING',
  ITINERARIES: 'ITINERARIES',
  EMPTY_LEGS: 'EMPTY_LEGS',
  CLIENTS: 'CLIENTS',
  LEADS_AGENTS: 'LEADS_AGENTS',
  TRIP_REQUESTS: 'TRIP_REQUESTS',
  REFERRALS: 'REFERRALS',
  QUOTES: 'QUOTES',
  EMAIL_TEMPLATES: 'EMAIL_TEMPLATES',
  OPERATORS: 'OPERATORS',
  AIRCRAFT: 'AIRCRAFT',
  AIRPORTS: 'AIRPORTS',
  DOCUMENTS: 'DOCUMENTS',
  RECEIVABLES: 'RECEIVABLES',
  OPERATOR_PAYMENTS: 'OPERATOR_PAYMENTS',
  COMMISSIONS: 'COMMISSIONS',
  TRANSACTIONS: 'TRANSACTIONS',
  REPORTS: 'REPORTS',
  TASKS: 'TASKS',
  USERS: 'USERS',
  SETTINGS: 'SETTINGS',
} as const;
export type Module = (typeof Module)[keyof typeof Module];

export const Action = {
  VIEW: 'VIEW',
  CREATE: 'CREATE',
  EDIT: 'EDIT',
  /** Archive and restore — nothing in this system is ever hard-deleted. */
  ARCHIVE: 'ARCHIVE',
  /** Hand a record to another broker. */
  ASSIGN: 'ASSIGN',
  /** Email it to a client or an operator. */
  SEND: 'SEND',
  /** Record money moving — a payment received, a bill or commission paid. */
  PAY: 'PAY',
  EXPORT: 'EXPORT',
  /** Cost, profit and margin — the figures a client never sees. */
  VIEW_MONEY: 'VIEW_MONEY',
  /** Passports and IDs (scope §11: restricted access). */
  VIEW_SENSITIVE: 'VIEW_SENSITIVE',
  /** Change a person's role and permissions. */
  MANAGE_ACCESS: 'MANAGE_ACCESS',
} as const;
export type Action = (typeof Action)[keyof typeof Action];

/** How far a granted action reaches. Fixed by the role, never per person. */
export const Reach = {
  /** Records they own or created. */
  OWN: 'OWN',
  /** Records assigned to them. */
  ASSIGNED: 'ASSIGNED',
  /** Every record. */
  ALL: 'ALL',
} as const;
export type Reach = (typeof Reach)[keyof typeof Reach];

export const ACTION_LABELS: Record<Action, string> = {
  VIEW: 'View',
  CREATE: 'Create',
  EDIT: 'Edit',
  ARCHIVE: 'Archive / restore',
  ASSIGN: 'Reassign',
  SEND: 'Send',
  PAY: 'Record payments',
  EXPORT: 'Export',
  VIEW_MONEY: 'See cost & profit',
  VIEW_SENSITIVE: 'Passports & IDs',
  MANAGE_ACCESS: 'Change roles & permissions',
};

export interface ModuleDefinition {
  module: Module;
  label: string;
  /** The sidebar section it sits in, so the screens read in the same order. */
  section: string;
  /** What can be done inside it. VIEW is always first and always present. */
  actions: Action[];
  /**
   * Modules it cannot work without. Granting this one grants VIEW on these,
   * and the form says so — a quote cannot be built without its client.
   */
  requires?: Module[];
  /** Per-module wording where the generic label would mislead. */
  actionLabels?: Partial<Record<Action, string>>;
}

const { VIEW, CREATE, EDIT, ARCHIVE, ASSIGN, SEND, PAY, EXPORT, VIEW_MONEY, VIEW_SENSITIVE, MANAGE_ACCESS } =
  Action;

/** In sidebar order. */
export const MODULES: ModuleDefinition[] = [
  { module: Module.DASHBOARD, label: 'Dashboard', section: 'Dashboard', actions: [VIEW, VIEW_MONEY] },

  { module: Module.TRIPS, label: 'Trips', section: 'Operations', actions: [VIEW, CREATE, EDIT, ARCHIVE, VIEW_MONEY], requires: [Module.CLIENTS] },
  { module: Module.SCHEDULE, label: 'Schedule', section: 'Operations', actions: [VIEW], requires: [Module.TRIPS] },
  {
    module: Module.OPERATOR_SOURCING,
    label: 'Operator Sourcing',
    section: 'Operations',
    actions: [VIEW, CREATE, EDIT, ARCHIVE],
    requires: [Module.TRIP_REQUESTS, Module.OPERATORS],
    actionLabels: { CREATE: 'Ask operators', EDIT: 'Record operator quotes' },
  },
  {
    module: Module.FLIGHT_TRACKING,
    label: 'Flight Tracking',
    section: 'Operations',
    actions: [VIEW, EDIT],
    requires: [Module.TRIPS],
    actionLabels: { EDIT: 'Update flight status' },
  },
  { module: Module.ITINERARIES, label: 'Itineraries', section: 'Operations', actions: [VIEW, CREATE, EDIT, SEND], requires: [Module.TRIPS] },
  {
    module: Module.EMPTY_LEGS,
    label: 'Empty Legs',
    section: 'Operations',
    actions: [VIEW, CREATE, EDIT, ARCHIVE],
    requires: [Module.OPERATORS, Module.AIRCRAFT],
  },

  { module: Module.CLIENTS, label: 'Clients', section: 'Sales & CRM', actions: [VIEW, CREATE, EDIT, ASSIGN, ARCHIVE] },
  {
    module: Module.LEADS_AGENTS,
    label: 'Leads & Agents',
    section: 'Sales & CRM',
    actions: [VIEW, CREATE, EDIT, ASSIGN, ARCHIVE],
    requires: [Module.CLIENTS],
  },
  {
    module: Module.TRIP_REQUESTS,
    label: 'Trip Requests',
    section: 'Sales & CRM',
    actions: [VIEW, CREATE, EDIT, ASSIGN, ARCHIVE],
    requires: [Module.CLIENTS],
  },
  { module: Module.REFERRALS, label: 'Referrals', section: 'Sales & CRM', actions: [VIEW, CREATE, EDIT, ARCHIVE] },
  {
    module: Module.QUOTES,
    label: 'Quotes',
    section: 'Sales & CRM',
    actions: [VIEW, CREATE, EDIT, SEND, VIEW_MONEY, ARCHIVE],
    requires: [Module.CLIENTS, Module.TRIP_REQUESTS],
  },
  {
    module: Module.EMAIL_TEMPLATES,
    label: 'Email Templates',
    section: 'Sales & CRM',
    actions: [VIEW, SEND, CREATE, EDIT, ARCHIVE],
    actionLabels: { VIEW: 'Use templates', SEND: 'Send emails', CREATE: 'Create templates', EDIT: 'Edit templates' },
  },

  { module: Module.OPERATORS, label: 'Operators', section: 'Database', actions: [VIEW, CREATE, EDIT, ARCHIVE] },
  { module: Module.AIRCRAFT, label: 'Aircraft', section: 'Database', actions: [VIEW, CREATE, EDIT, ARCHIVE], requires: [Module.OPERATORS] },
  { module: Module.AIRPORTS, label: 'Airports', section: 'Database', actions: [VIEW, CREATE, EDIT, ARCHIVE] },
  {
    module: Module.DOCUMENTS,
    label: 'Document Vault',
    section: 'Database',
    actions: [VIEW, CREATE, EDIT, ARCHIVE, VIEW_SENSITIVE],
    actionLabels: { CREATE: 'File documents' },
  },

  {
    module: Module.RECEIVABLES,
    label: 'Receivables',
    section: 'Finance',
    actions: [VIEW, CREATE, PAY, ARCHIVE, EXPORT],
    requires: [Module.TRIPS],
    actionLabels: { CREATE: 'Create invoices', ARCHIVE: 'Void invoices / payments' },
  },
  {
    module: Module.OPERATOR_PAYMENTS,
    label: 'Operator Payments',
    section: 'Finance',
    actions: [VIEW, CREATE, PAY, ARCHIVE],
    requires: [Module.TRIPS, Module.OPERATORS],
    actionLabels: { CREATE: 'Record bills' },
  },
  {
    module: Module.COMMISSIONS,
    label: 'Commissions',
    section: 'Finance',
    actions: [VIEW, CREATE, PAY, ARCHIVE],
    actionLabels: { CREATE: 'Raise commissions' },
  },
  { module: Module.TRANSACTIONS, label: 'Transactions', section: 'Finance', actions: [VIEW, EXPORT] },

  { module: Module.REPORTS, label: 'Reports', section: 'Reports', actions: [VIEW, EXPORT] },

  { module: Module.TASKS, label: 'Tasks Board', section: 'System', actions: [VIEW, CREATE, EDIT, ASSIGN, ARCHIVE] },
  {
    module: Module.USERS,
    label: 'Users & Roles',
    section: 'System',
    actions: [VIEW, CREATE, EDIT, MANAGE_ACCESS],
    actionLabels: { CREATE: 'Invite users', EDIT: 'Edit / suspend users' },
  },
  { module: Module.SETTINGS, label: 'Settings', section: 'System', actions: [VIEW, EDIT] },
];

export const MODULE_BY_KEY = Object.fromEntries(MODULES.map((m) => [m.module, m])) as Record<
  Module,
  ModuleDefinition
>;

export function actionLabel(module: Module, action: Action): string {
  return MODULE_BY_KEY[module]?.actionLabels?.[action] ?? ACTION_LABELS[action];
}
