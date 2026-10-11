import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import {
  ACCESS_KEY,
  PERMISSIONS_KEY,
  STAFF_ONLY_KEY,
} from '../../common/constants/auth.constants.js';
import { Action, Module, Reach } from '../../common/authorization/access.js';
import { AccessGuard } from '../../common/guards/access.guard.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { DashboardController } from './dashboard.controller.js';
import { activityWhere, ACTIVITY_MODULE } from './dashboard.activity.js';

const handler = (name: keyof DashboardController) =>
  DashboardController.prototype[name] as unknown as object;

/** A request context for the guard, as `name` on DashboardController, called with user. */
const contextFor = (
  name: keyof DashboardController,
  role: UserRole,
  access: Record<string, { reach: Reach; actions: Action[] }> = {},
) =>
  ({
    getHandler: () => handler(name),
    getClass: () => DashboardController,
    switchToHttp: () => ({
      getRequest: () => ({
        user: { id: 'u-1', email: 'user@example.com', role, access },
      }),
    }),
  }) as never;

describe('Dashboard routes access (Dashboard review, Module #30)', () => {
  const reflector = new Reflector();
  const guard = new AccessGuard(reflector);

  describe('DashboardController class guards', () => {
    it('controller is marked staff-only', () => {
      expect(Reflect.getMetadata(STAFF_ONLY_KEY, DashboardController)).toBe(true);
    });

    it('refuses outside partner (referral agent) with 403', () => {
      const access = {
        [Module.DASHBOARD]: { reach: Reach.ALL, actions: [Action.VIEW] },
      };
      expect(() =>
        guard.canActivate(contextFor('summary', UserRole.REFERRAL_AGENT, access)),
      ).toThrow(ForbiddenException);
    });

    it('admits staff roles through the class check', () => {
      const access = {
        [Module.DASHBOARD]: { reach: Reach.ALL, actions: [Action.VIEW] },
      };
      expect(guard.canActivate(contextFor('summary', UserRole.BROKER, access))).toBe(true);
    });
  });

  describe('Per-person route permissions', () => {
    const handlers: Array<keyof DashboardController> = ['summary', 'priorities', 'activity'];

    for (const name of handlers) {
      it(`${name} requires DASHBOARD · VIEW`, () => {
        expect(Reflect.getMetadata(ACCESS_KEY, handler(name))).toEqual({
          module: Module.DASHBOARD,
          action: Action.VIEW,
        });
        expect(Reflect.getMetadata(PERMISSIONS_KEY, handler(name))).toBeUndefined();
      });

      it(`${name} refuses staff member lacking Action.VIEW`, () => {
        const ctx = contextFor(name, UserRole.BROKER, {
          [Module.DASHBOARD]: { reach: Reach.ALL, actions: [] },
        });
        expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
      });

      it(`${name} allows staff member holding Action.VIEW`, () => {
        const ctx = contextFor(name, UserRole.BROKER, {
          [Module.DASHBOARD]: { reach: Reach.ALL, actions: [Action.VIEW] },
        });
        expect(guard.canActivate(ctx)).toBe(true);
      });
    }
  });

  describe('activityWhere scoping logic', () => {
    it('super admin reaches all entity types with no actor filter', () => {
      const user = {
        id: 'admin-1',
        email: 'admin@tribecajets.com',
        role: UserRole.SUPER_ADMIN,
        access: {},
      };
      const where = activityWhere(user as never);
      expect(where.AND).toBeDefined();
    });

    it('broker reaches only own activity for Reach.OWN modules', () => {
      const user = {
        id: 'broker-1',
        email: 'broker@tribecajets.com',
        role: UserRole.BROKER,
        access: {
          [Module.TRIPS]: { reach: Reach.OWN, actions: [Action.VIEW] },
          [Module.CLIENTS]: { reach: Reach.ASSIGNED, actions: [Action.VIEW] },
        },
      };
      const where = activityWhere(user as never);
      expect(where.AND).toBeDefined();
    });

    it('user without permission for a module does not see its entity type', () => {
      const user = {
        id: 'staff-1',
        email: 'staff@tribecajets.com',
        role: UserRole.BROKER,
        access: {
          [Module.TRIPS]: { reach: Reach.OWN, actions: [Action.VIEW] },
        },
      };
      const where = activityWhere(user as never);
      const orClauses = (where.AND as any[])[0].OR;
      const clientClause = orClauses.find((c: any) => c.entityType === 'Client');
      expect(clientClause).toBeUndefined();
      const tripClause = orClauses.find((c: any) => c.entityType === 'Trip');
      expect(tripClause).toEqual({ entityType: 'Trip', actorId: 'staff-1' });
    });
  });
});
