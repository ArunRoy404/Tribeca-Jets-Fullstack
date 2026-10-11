import { describe, expect, it } from 'vitest';
import { UserRole } from '../../generated/prisma/enums.js';
import { MODULES, MODULE_BY_KEY } from './access.catalogue.js';
import { ROLE_GRANTS } from './access.roles.js';
import {
  Action,
  Module,
  Reach,
  allowedActions,
  canDo,
  defaultGrants,
  normaliseGrants,
  reachOf,
  resolveAccess,
  roleDefaults,
} from './access.js';

describe('the role grants', () => {
  it('only name actions their module has', () => {
    for (const grants of Object.values(ROLE_GRANTS)) {
      for (const [module, grant] of Object.entries(grants)) {
        const actions = MODULE_BY_KEY[module as Module].actions;
        for (const action of [...(grant?.defaults ?? []), ...(grant?.optional ?? [])]) {
          expect(actions, `${module} · ${action}`).toContain(action);
        }
      }
    }
  });

  it('never let a referral agent into a staff module', () => {
    const agent = new Set(Object.keys(ROLE_GRANTS.REFERRAL_AGENT));
    expect([...agent].sort()).toEqual([Module.COMMISSIONS, Module.REFERRALS].sort());
  });

  it('give a broker no way to manage users or settings', () => {
    expect(allowedActions(UserRole.BROKER, Module.USERS)).toEqual([Action.VIEW]);
    expect(allowedActions(UserRole.BROKER, Module.SETTINGS)).toEqual([]);
    expect(allowedActions(UserRole.BROKER, Module.CLIENTS)).not.toContain(Action.ASSIGN);
  });
});

describe('defaultGrants', () => {
  it('starts a broker on their own trips with VIEW on every granted module', () => {
    const grants = defaultGrants(UserRole.BROKER);
    expect(grants.TRIPS).toEqual([Action.VIEW, Action.CREATE, Action.EDIT, Action.VIEW_MONEY]);
    expect(grants.USERS).toBeUndefined();
    for (const actions of Object.values(grants)) expect(actions?.[0]).toBe(Action.VIEW);
  });

  it('gives an administrator everything', () => {
    const grants = defaultGrants(UserRole.ADMIN);
    for (const definition of MODULES) expect(grants[definition.module]).toEqual(definition.actions);
  });
});

describe('resolveAccess', () => {
  it('reads an account with nothing saved as its role defaults, with the reach', () => {
    const access = resolveAccess(UserRole.BROKER, null);
    expect(access.CLIENTS).toEqual({ reach: Reach.ASSIGNED, actions: [Action.VIEW, Action.CREATE, Action.EDIT] });
  });

  it('keeps what was ticked for this one person', () => {
    const access = resolveAccess(UserRole.BROKER, { REPORTS: ['VIEW', 'EXPORT'] });
    expect(access.REPORTS?.actions).toEqual([Action.VIEW, Action.EXPORT]);
    // A saved set is the whole set: what was not ticked is not granted.
    expect(access.TRIPS).toBeUndefined();
  });

  it('drops what the role can never hold, whatever is stored', () => {
    const access = resolveAccess(UserRole.BROKER, { SETTINGS: ['VIEW', 'EDIT'], CLIENTS: ['VIEW', 'ASSIGN'], NOPE: ['VIEW'] });
    expect(access.SETTINGS).toBeUndefined();
    expect(access.CLIENTS?.actions).toEqual([Action.VIEW]);
  });

  it('gives the owner every action at every reach', () => {
    const access = resolveAccess(UserRole.SUPER_ADMIN, { TRIPS: [] });
    for (const definition of MODULES) {
      expect(access[definition.module]).toEqual({ reach: Reach.ALL, actions: definition.actions });
    }
  });
});

describe('normaliseGrants', () => {
  it('adds VIEW and the modules a ticked one needs, and says so', () => {
    const { grants, added } = normaliseGrants(UserRole.BROKER, { QUOTES: ['SEND'] });
    expect(grants.QUOTES).toEqual([Action.VIEW, Action.SEND]);
    expect(grants.CLIENTS).toEqual([Action.VIEW]);
    expect(grants.TRIP_REQUESTS).toEqual([Action.VIEW]);
    expect(added).toEqual(
      expect.arrayContaining([
        { module: Module.CLIENTS, requiredBy: Module.QUOTES },
        { module: Module.TRIP_REQUESTS, requiredBy: Module.QUOTES },
      ]),
    );
  });

  it('refuses what the role can never hold, naming each', () => {
    expect(() => normaliseGrants(UserRole.BROKER, { SETTINGS: ['VIEW'] })).toThrow(/Broker can never have Settings/);
    expect(() => normaliseGrants(UserRole.BROKER, { CLIENTS: ['ASSIGN'] })).toThrow(/Clients · Reassign/);
    expect(() => normaliseGrants(UserRole.REFERRAL_AGENT, { TRIPS: ['VIEW'] })).toThrow(/Referral Agent can never have Trips/);
  });

  it('refuses an action the module does not have', () => {
    expect(() => normaliseGrants(UserRole.ADMIN, { SCHEDULE: ['EXPORT'] })).toThrow(/Schedule has no "EXPORT"/);
  });

  it('refuses to grant what the grantor does not hold, unless the grantor is the owner', () => {
    const grantor = { role: UserRole.ADMIN, access: resolveAccess(UserRole.ADMIN, { USERS: ['VIEW', 'CREATE', 'MANAGE_ACCESS'] }) };
    expect(() => normaliseGrants(UserRole.BROKER, { REPORTS: ['VIEW', 'EXPORT'] }, grantor)).toThrow(/which you do not have yourself/);

    const owner = { role: UserRole.SUPER_ADMIN, access: {} };
    expect(normaliseGrants(UserRole.BROKER, { REPORTS: ['VIEW', 'EXPORT'] }, owner).grants.REPORTS).toEqual([
      Action.VIEW,
      Action.EXPORT,
    ]);
  });

  it('treats an empty list as no access to that module', () => {
    expect(normaliseGrants(UserRole.BROKER, { TRIPS: [] }).grants.TRIPS).toBeUndefined();
  });
});

describe('canDo and reachOf', () => {
  const access = resolveAccess(UserRole.BROKER, null);

  it('answer from the session map', () => {
    expect(canDo(access, Module.TRIPS, Action.EDIT)).toBe(true);
    expect(canDo(access, Module.TRIPS, Action.ARCHIVE)).toBe(false);
    expect(reachOf(access, Module.TRIPS)).toBe(Reach.OWN);
    expect(reachOf(access, Module.SETTINGS)).toBeNull();
  });

  it('deny a session with no map at all', () => {
    expect(canDo(undefined, Module.DASHBOARD)).toBe(false);
  });
});

describe('roleDefaults', () => {
  it('marks each action default, optional or locked for the form', () => {
    const quotes = roleDefaults(UserRole.BROKER).modules.find((m) => m.module === Module.QUOTES);
    const byAction = Object.fromEntries((quotes?.actions ?? []).map((a) => [a.action, a]));
    expect(byAction.SEND).toMatchObject({ default: true, locked: false });
    expect(byAction.ARCHIVE).toMatchObject({ default: false, locked: false });
    expect(quotes?.reach).toBe(Reach.OWN);
    expect(quotes?.requires).toEqual([Module.CLIENTS, Module.TRIP_REQUESTS]);

    const settings = roleDefaults(UserRole.BROKER).modules.find((m) => m.module === Module.SETTINGS);
    expect(settings?.available).toBe(false);
    expect(settings?.actions.every((a) => a.locked)).toBe(true);
  });

  it('marks the owner as not editable', () => {
    expect(roleDefaults(UserRole.SUPER_ADMIN).editable).toBe(false);
  });
});
