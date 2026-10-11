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
import { CommissionsController } from './commissions.controller.js';

const handler = (name: keyof CommissionsController) =>
  CommissionsController.prototype[name] as unknown as object;

/** A request context for the guard, as `name` on CommissionsController, called with user. */
const contextFor = (
  name: keyof CommissionsController,
  role: UserRole,
  access: Record<string, { reach: Reach; actions: Action[] }> = {},
) =>
  ({
    getHandler: () => handler(name),
    getClass: () => CommissionsController,
    switchToHttp: () => ({
      getRequest: () => ({
        user: { id: 'u-1', email: 'user@example.com', role, access },
      }),
    }),
  }) as never;

describe('commissions routes access (Commissions review, 11 Oct 2026)', () => {
  it('reads need only a session, nothing from the old matrix', () => {
    for (const name of ['findAll', 'stats', 'findOne'] as const) {
      expect(Reflect.getMetadata(ACCESS_KEY, handler(name)), name).toBeUndefined();
      expect(
        Reflect.getMetadata(PERMISSIONS_KEY, handler(name)),
        name,
      ).toBeUndefined();
    }
  });

  it('each write needs its granular COMMISSIONS permission', () => {
    const expected: Record<string, Action> = {
      create: Action.CREATE,
      removeMany: Action.ARCHIVE,
      restoreMany: Action.ARCHIVE,
      remove: Action.ARCHIVE,
      restore: Action.ARCHIVE,
    };

    for (const [name, action] of Object.entries(expected)) {
      expect(
        Reflect.getMetadata(
          ACCESS_KEY,
          handler(name as keyof CommissionsController),
        ),
        name,
      ).toEqual({
        module: Module.COMMISSIONS,
        action,
        altModule: undefined,
      });
      expect(
        Reflect.getMetadata(
          PERMISSIONS_KEY,
          handler(name as keyof CommissionsController),
        ),
        name,
      ).toBeUndefined();
    }
  });

  it('controller is NOT marked staff-only because referral agents read their own commissions', () => {
    expect(Reflect.getMetadata(STAFF_ONLY_KEY, CommissionsController)).toBeUndefined();
  });

  it('a referral agent can read commissions routes for their portal', () => {
    const guard = new AccessGuard(new Reflector());
    expect(
      guard.canActivate(contextFor('findAll', UserRole.REFERRAL_AGENT)),
    ).toBe(true);
    expect(
      guard.canActivate(contextFor('stats', UserRole.REFERRAL_AGENT)),
    ).toBe(true);
    expect(
      guard.canActivate(contextFor('findOne', UserRole.REFERRAL_AGENT)),
    ).toBe(true);
  });

  it('a referral agent cannot create or archive commissions (403)', () => {
    const guard = new AccessGuard(new Reflector());
    const agentAccess = {
      [Module.COMMISSIONS]: { reach: Reach.OWN, actions: [Action.VIEW] },
    };
    expect(() =>
      guard.canActivate(contextFor('create', UserRole.REFERRAL_AGENT, agentAccess)),
    ).toThrow(ForbiddenException);
    expect(() =>
      guard.canActivate(contextFor('remove', UserRole.REFERRAL_AGENT, agentAccess)),
    ).toThrow(ForbiddenException);
  });

  it('staff without CREATE cannot raise commissions (403)', () => {
    const guard = new AccessGuard(new Reflector());
    const brokerAccess = {
      [Module.COMMISSIONS]: { reach: Reach.OWN, actions: [Action.VIEW] },
    };
    expect(() =>
      guard.canActivate(contextFor('create', UserRole.BROKER, brokerAccess)),
    ).toThrow(ForbiddenException);
  });

  it('staff with CREATE can raise commissions', () => {
    const guard = new AccessGuard(new Reflector());
    const adminAccess = {
      [Module.COMMISSIONS]: {
        reach: Reach.ALL,
        actions: [Action.VIEW, Action.CREATE, Action.PAY, Action.ARCHIVE],
      },
    };
    expect(
      guard.canActivate(contextFor('create', UserRole.ADMIN, adminAccess)),
    ).toBe(true);
    expect(
      guard.canActivate(contextFor('remove', UserRole.ADMIN, adminAccess)),
    ).toBe(true);
    expect(
      guard.canActivate(contextFor('restore', UserRole.ADMIN, adminAccess)),
    ).toBe(true);
  });
});
