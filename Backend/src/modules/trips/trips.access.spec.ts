import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import {
  ACCESS_KEY,
  STAFF_ONLY_KEY,
} from '../../common/constants/auth.constants.js';
import { Action, Module, allowedActions, defaultGrants } from '../../common/authorization/access.js';
import { AccessGuard } from '../../common/guards/access.guard.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { TripsController } from './trips.controller.js';
import { TripsService } from './trips.service.js';

const handler = (name: keyof TripsController) =>
  TripsController.prototype[name] as unknown as object;

/** A request context for the guard, as `name` on the trips controller, called by `role`. */
const contextFor = (name: keyof TripsController, role: UserRole) =>
  ({
    getHandler: () => handler(name),
    getClass: () => TripsController,
    switchToHttp: () => ({
      getRequest: () => ({
        user: { id: 'u', email: 'x@example.com', role, access: {} },
      }),
    }),
  }) as never;

describe('trips routes (Trips review, 10 Oct 2026)', () => {
  it('reads need only a session', () => {
    for (const name of ['findAll', 'stats', 'findOne'] as const) {
      expect(Reflect.getMetadata(ACCESS_KEY, handler(name)), name).toBeUndefined();
    }
  });

  it('each write needs its Trips permission', () => {
    const expected = {
      create: Action.CREATE,
      bookFromQuote: Action.CREATE,
      update: Action.EDIT,
      changeStatus: Action.EDIT,
      approve: Action.APPROVE,
      reject: Action.APPROVE,
      remove: Action.ARCHIVE,
      restore: Action.ARCHIVE,
      removeMany: Action.ARCHIVE,
      restoreMany: Action.ARCHIVE,
    } as const;

    for (const [name, action] of Object.entries(expected)) {
      expect(
        Reflect.getMetadata(
          ACCESS_KEY,
          handler(name as keyof TripsController),
        ),
        name,
      ).toEqual({
        module: Module.TRIPS,
        action,
        altModule: undefined,
      });
    }
  });

  it('is staff only: a referral agent is refused even an open read', () => {
    expect(Reflect.getMetadata(STAFF_ONLY_KEY, TripsController)).toBe(true);
    const guard = new AccessGuard(new Reflector());
    expect(() =>
      guard.canActivate(contextFor('findAll', UserRole.REFERRAL_AGENT)),
    ).toThrow(ForbiddenException);
    expect(guard.canActivate(contextFor('findAll', UserRole.ASSISTANT))).toBe(true);
  });
});

describe('Trips · Reassign trips is a permission, not a role (10 Nov 2026)', () => {
  it('administrators start with it; brokers, assistants and partners can never hold it', () => {
    expect(defaultGrants(UserRole.ADMIN)[Module.TRIPS]).toContain(Action.ASSIGN);
    for (const role of [UserRole.BROKER, UserRole.ASSISTANT, UserRole.REFERRAL_AGENT]) {
      expect(allowedActions(role, Module.TRIPS), role).not.toContain(Action.ASSIGN);
    }
  });

  it('the service asks the permission, so an admin whose set drops it is refused', () => {
    const service = new TripsService({} as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never);
    const assert = (access: Record<string, unknown>) => () =>
      (service as unknown as { assertMayReassign: (u: unknown) => void }).assertMayReassign({
        id: 'u',
        email: 'x@example.com',
        role: UserRole.ADMIN,
        access,
      });
    expect(assert({ [Module.TRIPS]: { reach: 'ALL', actions: [Action.VIEW, Action.EDIT] } })).toThrow(ForbiddenException);
    expect(assert({ [Module.TRIPS]: { reach: 'ALL', actions: [Action.VIEW, Action.EDIT, Action.ASSIGN] } })).not.toThrow();
  });
});
