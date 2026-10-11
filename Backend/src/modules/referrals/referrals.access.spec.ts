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
import {
  ReferralResourcesController,
  ReferralsController,
} from './referrals.controller.js';

const referralHandler = (name: keyof ReferralsController) =>
  ReferralsController.prototype[name] as unknown as object;

const resourceHandler = (name: keyof ReferralResourcesController) =>
  ReferralResourcesController.prototype[name] as unknown as object;

/** A request context for the guard, as `name` on ReferralsController, called with user. */
const referralContextFor = (
  name: keyof ReferralsController,
  role: UserRole,
  access: Record<string, { reach: Reach; actions: Action[] }> = {},
) =>
  ({
    getHandler: () => referralHandler(name),
    getClass: () => ReferralsController,
    switchToHttp: () => ({
      getRequest: () => ({
        user: { id: 'u-1', email: 'user@example.com', role, access },
      }),
    }),
  }) as never;

const resourceContextFor = (
  name: keyof ReferralResourcesController,
  role: UserRole,
  access: Record<string, { reach: Reach; actions: Action[] }> = {},
) =>
  ({
    getHandler: () => resourceHandler(name),
    getClass: () => ReferralResourcesController,
    switchToHttp: () => ({
      getRequest: () => ({
        user: { id: 'u-1', email: 'user@example.com', role, access },
      }),
    }),
  }) as never;

describe('referrals routes access (Referrals review, 11 Oct 2026)', () => {
  it('reads need only a session, nothing from the old matrix', () => {
    for (const name of ['findAll', 'stats', 'findOne', 'attachment'] as const) {
      expect(Reflect.getMetadata(ACCESS_KEY, referralHandler(name)), name).toBeUndefined();
      expect(
        Reflect.getMetadata(PERMISSIONS_KEY, referralHandler(name)),
        name,
      ).toBeUndefined();
    }
  });

  it('each write needs its granular REFERRALS permission', () => {
    const expected: Record<string, Action> = {
      submit: Action.CREATE,
      removeMany: Action.ARCHIVE,
      restoreMany: Action.ARCHIVE,
      update: Action.EDIT,
      convert: Action.EDIT,
      remove: Action.ARCHIVE,
      restore: Action.ARCHIVE,
    };

    for (const [name, action] of Object.entries(expected)) {
      expect(
        Reflect.getMetadata(
          ACCESS_KEY,
          referralHandler(name as keyof ReferralsController),
        ),
        name,
      ).toEqual({
        module: Module.REFERRALS,
        action,
        altModule: undefined,
      });
      expect(
        Reflect.getMetadata(
          PERMISSIONS_KEY,
          referralHandler(name as keyof ReferralsController),
        ),
        name,
      ).toBeUndefined();
    }
  });

  it('controller is NOT marked staff-only because referral agents submit and read their referrals', () => {
    expect(Reflect.getMetadata(STAFF_ONLY_KEY, ReferralsController)).toBeUndefined();
  });

  it('a referral agent can read referrals routes for their portal', () => {
    const guard = new AccessGuard(new Reflector());
    expect(
      guard.canActivate(referralContextFor('findAll', UserRole.REFERRAL_AGENT)),
    ).toBe(true);
    expect(
      guard.canActivate(referralContextFor('stats', UserRole.REFERRAL_AGENT)),
    ).toBe(true);
    expect(
      guard.canActivate(referralContextFor('findOne', UserRole.REFERRAL_AGENT)),
    ).toBe(true);
    expect(
      guard.canActivate(referralContextFor('attachment', UserRole.REFERRAL_AGENT)),
    ).toBe(true);
  });

  it('a referral agent can submit a referral with CREATE permission', () => {
    const guard = new AccessGuard(new Reflector());
    const agentAccess = {
      [Module.REFERRALS]: { reach: Reach.OWN, actions: [Action.VIEW, Action.CREATE] },
    };
    expect(
      guard.canActivate(referralContextFor('submit', UserRole.REFERRAL_AGENT, agentAccess)),
    ).toBe(true);
  });

  it('a referral agent cannot edit, convert or archive referrals (403)', () => {
    const guard = new AccessGuard(new Reflector());
    const agentAccess = {
      [Module.REFERRALS]: { reach: Reach.OWN, actions: [Action.VIEW, Action.CREATE] },
    };
    expect(() =>
      guard.canActivate(referralContextFor('update', UserRole.REFERRAL_AGENT, agentAccess)),
    ).toThrow(ForbiddenException);
    expect(() =>
      guard.canActivate(referralContextFor('convert', UserRole.REFERRAL_AGENT, agentAccess)),
    ).toThrow(ForbiddenException);
    expect(() =>
      guard.canActivate(referralContextFor('remove', UserRole.REFERRAL_AGENT, agentAccess)),
    ).toThrow(ForbiddenException);
  });
});

describe('referral resources routes access', () => {
  it('reads need only a session', () => {
    expect(Reflect.getMetadata(ACCESS_KEY, resourceHandler('findAll'))).toBeUndefined();
    expect(Reflect.getMetadata(PERMISSIONS_KEY, resourceHandler('findAll'))).toBeUndefined();
  });

  it('each write needs its granular REFERRALS permission', () => {
    const expected: Record<string, Action> = {
      create: Action.CREATE,
      update: Action.EDIT,
      remove: Action.ARCHIVE,
      restore: Action.ARCHIVE,
    };

    for (const [name, action] of Object.entries(expected)) {
      expect(
        Reflect.getMetadata(
          ACCESS_KEY,
          resourceHandler(name as keyof ReferralResourcesController),
        ),
        name,
      ).toEqual({
        module: Module.REFERRALS,
        action,
        altModule: undefined,
      });
      expect(
        Reflect.getMetadata(
          PERMISSIONS_KEY,
          resourceHandler(name as keyof ReferralResourcesController),
        ),
        name,
      ).toBeUndefined();
    }
  });

  it('controller is NOT marked staff-only because referral agents read resources', () => {
    expect(Reflect.getMetadata(STAFF_ONLY_KEY, ReferralResourcesController)).toBeUndefined();
  });

  it('a referral agent can read resources', () => {
    const guard = new AccessGuard(new Reflector());
    expect(
      guard.canActivate(resourceContextFor('findAll', UserRole.REFERRAL_AGENT)),
    ).toBe(true);
  });
});
