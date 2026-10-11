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
import { ReportsController } from './reports.controller.js';

const handler = (name: keyof ReportsController) =>
  ReportsController.prototype[name] as unknown as object;

/** A request context for the guard, as `name` on ReportsController, called with user. */
const contextFor = (
  name: keyof ReportsController,
  role: UserRole,
  access: Record<string, { reach: Reach; actions: Action[] }> = {},
) =>
  ({
    getHandler: () => handler(name),
    getClass: () => ReportsController,
    switchToHttp: () => ({
      getRequest: () => ({
        user: { id: 'u-1', email: 'user@example.com', role, access },
      }),
    }),
  }) as never;

describe('Reports routes access (Reports review, Module #29)', () => {
  const reflector = new Reflector();
  const guard = new AccessGuard(reflector);

  describe('ReportsController class guards', () => {
    it('controller is marked staff-only', () => {
      expect(Reflect.getMetadata(STAFF_ONLY_KEY, ReportsController)).toBe(true);
    });

    it('refuses outside partner (referral agent) with 403', () => {
      const access = {
        [Module.REPORTS]: { reach: Reach.ALL, actions: [Action.VIEW, Action.EXPORT] },
      };
      expect(() =>
        guard.canActivate(contextFor('summary', UserRole.REFERRAL_AGENT, access)),
      ).toThrow(ForbiddenException);
    });

    it('admits staff roles through the class check', () => {
      const access = {
        [Module.REPORTS]: { reach: Reach.OWN, actions: [Action.VIEW] },
      };
      expect(guard.canActivate(contextFor('summary', UserRole.BROKER, access))).toBe(true);
    });
  });

  describe('Per-person route permissions', () => {
    const viewHandlers: Array<keyof ReportsController> = [
      'summary',
      'series',
      'brokers',
      'clients',
      'routes',
    ];

    for (const name of viewHandlers) {
      it(`${name} requires REPORTS · VIEW`, () => {
        expect(Reflect.getMetadata(ACCESS_KEY, handler(name))).toEqual({
          module: Module.REPORTS,
          action: Action.VIEW,
        });
        expect(Reflect.getMetadata(PERMISSIONS_KEY, handler(name))).toBeUndefined();
      });

      it(`${name} refuses staff member lacking Action.VIEW`, () => {
        const ctx = contextFor(name, UserRole.BROKER, {
          [Module.REPORTS]: { reach: Reach.OWN, actions: [] },
        });
        expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
      });

      it(`${name} allows staff member holding Action.VIEW`, () => {
        const ctx = contextFor(name, UserRole.BROKER, {
          [Module.REPORTS]: { reach: Reach.OWN, actions: [Action.VIEW] },
        });
        expect(guard.canActivate(ctx)).toBe(true);
      });
    }

    it('export requires REPORTS · EXPORT', () => {
      expect(Reflect.getMetadata(ACCESS_KEY, handler('export'))).toEqual({
        module: Module.REPORTS,
        action: Action.EXPORT,
      });
      expect(Reflect.getMetadata(PERMISSIONS_KEY, handler('export'))).toBeUndefined();
    });

    it('export refuses staff member lacking Action.EXPORT', () => {
      const ctx = contextFor('export', UserRole.BROKER, {
        [Module.REPORTS]: { reach: Reach.OWN, actions: [Action.VIEW] },
      });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('export allows staff member holding Action.EXPORT', () => {
      const ctx = contextFor('export', UserRole.BROKER, {
        [Module.REPORTS]: { reach: Reach.OWN, actions: [Action.VIEW, Action.EXPORT] },
      });
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });
});
