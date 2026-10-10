import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { ACCESS_KEY, PERMISSIONS_KEY, STAFF_ONLY_KEY } from '../../common/constants/auth.constants.js';
import { Action, Module } from '../../common/authorization/access.js';
import { AccessGuard } from '../../common/guards/access.guard.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { TripRequestsController } from './trip-requests.controller.js';

const handler = (name: keyof TripRequestsController) =>
  TripRequestsController.prototype[name] as unknown as object;

/** A request context for the guard, as `name` on the trip-requests controller, called by `role`. */
const contextFor = (name: keyof TripRequestsController, role: UserRole) =>
  ({
    getHandler: () => handler(name),
    getClass: () => TripRequestsController,
    switchToHttp: () => ({ getRequest: () => ({ user: { id: 'u', email: 'x@example.com', role, access: {} } }) }),
  }) as never;

describe('trip-requests routes (Trip Requests review, 10 Oct 2026)', () => {
  it('reads need only a session, nothing from the old matrix', () => {
    for (const name of ['findAll', 'stats', 'findOne'] as const) {
      expect(Reflect.getMetadata(ACCESS_KEY, handler(name)), name).toBeUndefined();
      expect(Reflect.getMetadata(PERMISSIONS_KEY, handler(name)), name).toBeUndefined();
    }
  });

  it('each write needs its Trip Requests permission', () => {
    const expected = {
      create: Action.CREATE,
      update: Action.EDIT,
      remove: Action.ARCHIVE,
      removeMany: Action.ARCHIVE,
      restore: Action.ARCHIVE,
      restoreMany: Action.ARCHIVE,
    } as const;
    for (const [name, action] of Object.entries(expected)) {
      expect(Reflect.getMetadata(ACCESS_KEY, handler(name as keyof TripRequestsController)), name).toEqual({
        module: Module.TRIP_REQUESTS,
        action,
        altModule: Module.LEADS_AGENTS,
      });
    }
  });

  it('is staff only: a referral agent is refused even an open read', () => {
    expect(Reflect.getMetadata(STAFF_ONLY_KEY, TripRequestsController)).toBe(true);
    const guard = new AccessGuard(new Reflector());
    expect(() => guard.canActivate(contextFor('findAll', UserRole.REFERRAL_AGENT))).toThrow(ForbiddenException);
    expect(guard.canActivate(contextFor('findAll', UserRole.ASSISTANT))).toBe(true);
  });
});
