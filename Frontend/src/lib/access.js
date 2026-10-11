/**
 * The per-user permission vocabulary (owner's design, 7 Oct 2026), mirrored
 * from the API's `access.catalogue.ts`.
 *
 * A permission is a **module** (one per sidebar screen) and an **action**
 * inside it. `/auth/me` returns the person's own set as
 * `{ MODULE: { reach, actions } }`; a module that is absent has no access.
 * This file holds the *names* only — never who gets what, which the server
 * owns and sends.
 *
 * It decides what to render. The API enforces the same set on every route.
 */

export const Module = {
  DASHBOARD: "DASHBOARD",
  TRIPS: "TRIPS",
  SCHEDULE: "SCHEDULE",
  OPERATOR_SOURCING: "OPERATOR_SOURCING",
  FLIGHT_TRACKING: "FLIGHT_TRACKING",
  ITINERARIES: "ITINERARIES",
  EMPTY_LEGS: "EMPTY_LEGS",
  CLIENTS: "CLIENTS",
  LEADS_AGENTS: "LEADS_AGENTS",
  TRIP_REQUESTS: "TRIP_REQUESTS",
  REFERRALS: "REFERRALS",
  QUOTES: "QUOTES",
  EMAIL_TEMPLATES: "EMAIL_TEMPLATES",
  OPERATORS: "OPERATORS",
  AIRCRAFT: "AIRCRAFT",
  AIRPORTS: "AIRPORTS",
  DOCUMENTS: "DOCUMENTS",
  RECEIVABLES: "RECEIVABLES",
  OPERATOR_PAYMENTS: "OPERATOR_PAYMENTS",
  COMMISSIONS: "COMMISSIONS",
  TRANSACTIONS: "TRANSACTIONS",
  REPORTS: "REPORTS",
  TASKS: "TASKS",
  USERS: "USERS",
  SETTINGS: "SETTINGS",
};

export const Action = {
  VIEW: "VIEW",
  CREATE: "CREATE",
  EDIT: "EDIT",
  ARCHIVE: "ARCHIVE",
  ASSIGN: "ASSIGN",
  SEND: "SEND",
  PAY: "PAY",
  EXPORT: "EXPORT",
  VIEW_MONEY: "VIEW_MONEY",
  VIEW_SENSITIVE: "VIEW_SENSITIVE",
  MANAGE_ACCESS: "MANAGE_ACCESS",
};

export const Reach = {
  OWN: "OWN",
  ASSIGNED: "ASSIGNED",
  ALL: "ALL",
};

/** How far a role's actions reach. Fixed by the role, never per person. */
export const REACH_LABELS = {
  OWN: "Own only",
  ASSIGNED: "Assigned only",
  ALL: "All records",
};

export function formatReach(reach) {
  return REACH_LABELS[reach] ?? "—";
}

/** Whether a `/auth/me` permission map grants `action` in `module`. */
export function hasAccess(permissions, module, action = Action.VIEW) {
  return Boolean(permissions?.[module]?.actions?.includes(action));
}

// ---------------------------------------------------------------------------
// Editing one person's set — the invite and edit forms.
//
// A set is `{ MODULE: [ACTION, …] }`, the payload the API takes. `modules` is
// a role's view from `GET /roles/:role/defaults`: per module, `available`,
// `requires`, and each action's `default` / `locked`. The server re-checks all
// of it; these keep the form honest so it never offers what would be refused.
// ---------------------------------------------------------------------------

/** The role's starting set. */
export function defaultsFrom(modules) {
  return Object.fromEntries(
    (modules ?? [])
      .map((m) => [m.module, m.actions.filter((a) => a.default).map((a) => a.action)])
      .filter(([, actions]) => actions.length),
  );
}

/** A `/auth/me`-style map (with reach) back to a set. */
export function grantsFromPermissions(permissions) {
  return Object.fromEntries(
    Object.entries(permissions ?? {}).map(([module, grant]) => [module, [...(grant?.actions ?? [])]]),
  );
}

/** Whether two sets grant exactly the same actions. */
export function sameGrants(a, b) {
  const flat = (set) =>
    Object.entries(set ?? {})
      .flatMap(([module, actions]) => (actions ?? []).map((action) => `${module}.${action}`))
      .sort()
      .join("|");
  return flat(a) === flat(b);
}

const byKey = (modules) => Object.fromEntries((modules ?? []).map((m) => [m.module, m]));

/** Catalogue order, VIEW first — the order the API stores. */
function orderedActions(definition, actions) {
  const set = new Set([Action.VIEW, ...actions]);
  return definition.actions.map((a) => a.action).filter((action) => set.has(action));
}

/**
 * Turns a module on (with its role defaults, or VIEW alone) and pulls in what
 * it requires. Returns the next set and the modules added for it, so the form
 * can say so.
 */
export function grantModule(grants, modules, module) {
  const lookup = byKey(modules);
  const next = { ...grants };
  const added = [];
  const turnOn = (key) => {
    const definition = lookup[key];
    if (!definition?.available) return false;
    const defaults = definition.actions.filter((a) => a.default && !a.locked).map((a) => a.action);
    next[key] = orderedActions(definition, defaults);
    return true;
  };
  turnOn(module);

  const queue = [module];
  while (queue.length) {
    const key = queue.shift();
    for (const needed of lookup[key]?.requires ?? []) {
      if (next[needed]?.length) continue;
      if (turnOn(needed)) {
        next[needed] = [Action.VIEW];
        added.push(needed);
        queue.push(needed);
      }
    }
  }
  return { grants: next, added };
}

/** Ticked modules that need `module` — it cannot be turned off while they are on. */
export function dependantsOf(grants, modules, module) {
  return (modules ?? [])
    .filter((m) => m.module !== module && grants?.[m.module]?.length && m.requires?.includes(module))
    .map((m) => m.module);
}

/** Turns a module off. */
export function revokeModule(grants, module) {
  const next = { ...grants };
  delete next[module];
  return next;
}

/** Toggles one action in a module that is already on. VIEW stays. */
export function toggleAction(grants, modules, module, action) {
  const definition = byKey(modules)[module];
  if (!definition || action === Action.VIEW) return grants;
  const current = new Set(grants?.[module] ?? []);
  if (current.has(action)) current.delete(action);
  else current.add(action);
  return { ...grants, [module]: orderedActions(definition, current) };
}

/** A role's modules grouped by sidebar section, in catalogue order. */
export function bySection(modules) {
  const sections = [];
  for (const m of modules ?? []) {
    const last = sections[sections.length - 1];
    if (last?.label === m.section) last.modules.push(m);
    else sections.push({ label: m.section, modules: [m] });
  }
  return sections;
}
