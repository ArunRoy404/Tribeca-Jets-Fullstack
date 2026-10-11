import { BadRequestException } from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums.js';
import {
  Action,
  MODULES,
  MODULE_BY_KEY,
  Module,
  Reach,
  actionLabel,
} from './access.catalogue.js';
import { ROLE_GRANTS, type RoleGrant } from './access.roles.js';

export { Action, Module, Reach } from './access.catalogue.js';

/** What is stored on a user: the actions ticked per module. */
export type AccessGrants = Partial<Record<Module, Action[]>>;

/** What a session carries: the stored grants with the role's reach attached. */
export type AccessMap = Partial<Record<Module, { reach: Reach; actions: Action[] }>>;

const MODULE_KEYS = new Set<string>(Object.values(Module));
const ACTION_KEYS = new Set<string>(Object.values(Action));

const ROLE_NAMES: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  BROKER: 'Broker',
  ASSISTANT: 'Assistant',
  REFERRAL_AGENT: 'Referral Agent',
};

/** The role's grant for one module, or undefined when the module is locked. */
function grantFor(role: UserRole, module: Module): RoleGrant | undefined {
  if (role === UserRole.SUPER_ADMIN) {
    return { reach: Reach.ALL, defaults: [...MODULE_BY_KEY[module].actions], optional: [] };
  }
  return ROLE_GRANTS[role]?.[module];
}

/** Every action this role may ever hold in the module. */
export function allowedActions(role: UserRole, module: Module): Action[] {
  const grant = grantFor(role, module);
  if (!grant) return [];
  const allowed = new Set([...grant.defaults, ...grant.optional]);
  // VIEW comes with any other action, so a module with something optional is
  // a module that can be viewed.
  if (allowed.size) allowed.add(Action.VIEW);
  return MODULE_BY_KEY[module].actions.filter((action) => allowed.has(action));
}

/** In the catalogue's order, so stored and returned lists read the same way. */
function ordered(module: Module, actions: Iterable<Action>): Action[] {
  const set = new Set(actions);
  return MODULE_BY_KEY[module].actions.filter((action) => set.has(action));
}

/** What a new account of this role starts with. */
export function defaultGrants(role: UserRole): AccessGrants {
  const grants: AccessGrants = {};
  for (const { module } of MODULES) {
    const defaults = grantFor(role, module)?.defaults ?? [];
    if (defaults.length) grants[module] = ordered(module, [Action.VIEW, ...defaults]);
  }
  return grants;
}

/**
 * Turns a stored value into the session's map.
 *
 * A row that never had permissions saved (accounts created before 7 Oct
 * 2026) gets its role's defaults. Anything the role can no longer hold is
 * dropped rather than trusted — the stored JSON is the user's *choice*, the
 * role is the *limit*, and the limit wins.
 */
export function resolveAccess(role: UserRole, stored: unknown): AccessMap {
  const grants = role === UserRole.SUPER_ADMIN ? null : parseStored(stored) ?? defaultGrants(role);
  const map: AccessMap = {};

  for (const { module } of MODULES) {
    const grant = grantFor(role, module);
    if (!grant) continue;
    const allowed = new Set(allowedActions(role, module));
    const chosen = grants ? (grants[module] ?? []) : allowedActions(role, module);
    const actions = chosen.filter((action) => allowed.has(action));
    if (!actions.length) continue;
    map[module] = { reach: grant.reach, actions: ordered(module, [Action.VIEW, ...actions]) };
  }
  return map;
}

function parseStored(stored: unknown): AccessGrants | null {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return null;
  const grants: AccessGrants = {};
  for (const [module, actions] of Object.entries(stored as Record<string, unknown>)) {
    if (!MODULE_KEYS.has(module) || !Array.isArray(actions)) continue;
    grants[module as Module] = actions.filter(
      (action): action is Action => typeof action === 'string' && ACTION_KEYS.has(action),
    );
  }
  return grants;
}

export interface NormalisedGrants {
  grants: AccessGrants;
  /** Modules granted VIEW because a ticked module needs them. */
  added: { module: Module; requiredBy: Module }[];
}

/**
 * Checks a submitted permission set against the role and the grantor, and
 * fills in what the ticked modules depend on.
 *
 * Refused, with every reason named: a module or action the role can never
 * hold, and — unless the grantor is the owner — anything the grantor does
 * not hold themselves, so an administrator cannot mint access above their
 * own. VIEW is added to any module with another action, and VIEW on each
 * module a ticked one requires.
 */
export function normaliseGrants(
  role: UserRole,
  input: AccessGrants,
  grantor?: { role: UserRole; access: AccessMap },
): NormalisedGrants {
  const problems: string[] = [];
  const grants: AccessGrants = {};
  const roleName = ROLE_NAMES[role];

  for (const [key, actions] of Object.entries(input)) {
    const module = key as Module;
    if (!actions?.length) continue;
    const definition = MODULE_BY_KEY[module];
    const allowed = new Set(allowedActions(role, module));
    if (!allowed.size) {
      problems.push(`A ${roleName} can never have ${definition.label}.`);
      continue;
    }
    for (const action of actions) {
      if (!definition.actions.includes(action)) {
        problems.push(`${definition.label} has no "${action}" permission.`);
      } else if (!allowed.has(action)) {
        problems.push(`A ${roleName} can never have ${definition.label} · ${actionLabel(module, action)}.`);
      }
    }
    grants[module] = ordered(module, [Action.VIEW, ...actions.filter((a) => allowed.has(a))]);
  }

  // Dependencies, followed until nothing new is pulled in (Quotes → Trip
  // Requests → Clients).
  const added: NormalisedGrants['added'] = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (const module of Object.keys(grants) as Module[]) {
      for (const needed of MODULE_BY_KEY[module].requires ?? []) {
        if (grants[needed]?.length) continue;
        if (!allowedActions(role, needed).length) {
          problems.push(
            `${MODULE_BY_KEY[module].label} needs ${MODULE_BY_KEY[needed].label}, which a ${roleName} can never have.`,
          );
          continue;
        }
        grants[needed] = [Action.VIEW];
        added.push({ module: needed, requiredBy: module });
        changed = true;
      }
    }
  }

  if (grantor && grantor.role !== UserRole.SUPER_ADMIN) {
    for (const [key, actions] of Object.entries(grants)) {
      const module = key as Module;
      const held = new Set(grantor.access[module]?.actions ?? []);
      const missing = (actions ?? []).filter((action) => !held.has(action));
      if (missing.length) {
        problems.push(
          `You cannot grant ${MODULE_BY_KEY[module].label} · ${missing
            .map((action) => actionLabel(module, action))
            .join(', ')}, which you do not have yourself.`,
        );
      }
    }
  }

  if (problems.length) {
    const message = problems.join(' ');
    throw new BadRequestException({ message, errors: { permissions: message } });
  }
  return { grants, added };
}

/** Whether a session may perform `action` in `module`. */
export function canDo(access: AccessMap | undefined, module: Module, action: Action = Action.VIEW): boolean {
  return Boolean(access?.[module]?.actions.includes(action));
}

/** How far the session reaches in `module`, or null when it has no access. */
export function reachOf(access: AccessMap | undefined, module: Module): Reach | null {
  return access?.[module]?.reach ?? null;
}

/**
 * The form's view of one role: every module, what the role starts with, what
 * may be added, and what is locked. Powers the invite and edit forms and the
 * Roles & Permissions tab.
 */
export function roleDefaults(role: UserRole) {
  const defaults = defaultGrants(role);
  return {
    role,
    editable: role !== UserRole.SUPER_ADMIN,
    modules: MODULES.map((definition) => {
      const { module } = definition;
      const grant = grantFor(role, module);
      const allowed = new Set(allowedActions(role, module));
      const chosen = new Set(defaults[module] ?? []);
      return {
        module,
        label: definition.label,
        section: definition.section,
        reach: grant?.reach ?? null,
        available: allowed.size > 0,
        requires: definition.requires ?? [],
        actions: definition.actions.map((action) => ({
          action,
          label: actionLabel(module, action),
          default: chosen.has(action),
          locked: !allowed.has(action),
        })),
      };
    }),
  };
}
