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
import { OperatorPaymentsController } from './operator-payments.controller.js';

const handler = (name: keyof OperatorPaymentsController) =>
  OperatorPaymentsController.prototype[name] as unknown as object;

/** A request context for the guard, as `name` on OperatorPaymentsController, called with user. */
const contextFor = (
  name: keyof OperatorPaymentsController,
  role: UserRole,
  access: Record<string, { reach: Reach; actions: Action[] }> = {},
) =>
  ({
    getHandler: () => handler(name),
    getClass: () => OperatorPaymentsController,
    switchToHttp: () => ({
      getRequest: () => ({
        user: { id: 'u-1', email: 'user@example.com', role, access },
      }),
    }),
  }) as never;

describe('operator payments routes access (Operator Payments review, 11 Oct 2026)', () => {
  it('reads need only a session, nothing from the old matrix', () => {
    for (const name of ['findAll', 'stats', 'findOne'] as const) {
      expect(Reflect.getMetadata(ACCESS_KEY, handler(name)), name).toBeUndefined();
      expect(
        Reflect.getMetadata(PERMISSIONS_KEY, handler(name)),
        name,
      ).toBeUndefined();
    }
  });

  it('each write needs its granular OPERATOR_PAYMENTS permission', () => {
    const expected: Record<string, Action> = {
      create: Action.CREATE,
      update: Action.CREATE,
      removeMany: Action.ARCHIVE,
      restoreMany: Action.ARCHIVE,
      remove: Action.ARCHIVE,
      restore: Action.ARCHIVE,
      recordPayment: Action.PAY,
      updatePayment: Action.PAY,
      withdrawPayment: Action.ARCHIVE,
      restorePayment: Action.ARCHIVE,
    };

    for (const [name, action] of Object.entries(expected)) {
      expect(
        Reflect.getMetadata(
          ACCESS_KEY,
          handler(name as keyof OperatorPaymentsController),
        ),
        name,
      ).toEqual({
        module: Module.OPERATOR_PAYMENTS,
        action,
        altModule: undefined,
      });
      expect(
        Reflect.getMetadata(
          PERMISSIONS_KEY,
          handler(name as keyof OperatorPaymentsController),
        ),
        name,
      ).toBeUndefined();
    }
  });

  it('controller is marked staff-only', () => {
    expect(Reflect.getMetadata(STAFF_ONLY_KEY, OperatorPaymentsController)).toBe(true);
  });

  it('a referral agent cannot access operator payments routes (403 StaffOnly)', () => {
    const guard = new AccessGuard(new Reflector());
    expect(() =>
      guard.canActivate(contextFor('findAll', UserRole.REFERRAL_AGENT)),
    ).toThrow(ForbiddenException);
    expect(() =>
      guard.canActivate(contextFor('stats', UserRole.REFERRAL_AGENT)),
    ).toThrow(ForbiddenException);
    expect(() =>
      guard.canActivate(contextFor('findOne', UserRole.REFERRAL_AGENT)),
    ).toThrow(ForbiddenException);
    expect(() =>
      guard.canActivate(contextFor('create', UserRole.REFERRAL_AGENT)),
    ).toThrow(ForbiddenException);
  });

  it('staff can read operator payments routes without module permission', () => {
    const guard = new AccessGuard(new Reflector());
    // Open reads for staff (even an assistant with no operator payment grants)
    expect(guard.canActivate(contextFor('findAll', UserRole.ASSISTANT))).toBe(true);
    expect(guard.canActivate(contextFor('stats', UserRole.BROKER))).toBe(true);
    expect(guard.canActivate(contextFor('findOne', UserRole.ADMIN))).toBe(true);
  });

  it('staff writes refuse when the action is missing', () => {
    const guard = new AccessGuard(new Reflector());
    const readOnlyAccess = {
      [Module.OPERATOR_PAYMENTS]: { reach: Reach.OWN, actions: [Action.VIEW] },
    };

    expect(() =>
      guard.canActivate(contextFor('create', UserRole.BROKER, readOnlyAccess)),
    ).toThrow(ForbiddenException);
    expect(() =>
      guard.canActivate(contextFor('update', UserRole.BROKER, readOnlyAccess)),
    ).toThrow(ForbiddenException);
    expect(() =>
      guard.canActivate(contextFor('recordPayment', UserRole.BROKER, readOnlyAccess)),
    ).toThrow(ForbiddenException);
    expect(() =>
      guard.canActivate(contextFor('remove', UserRole.BROKER, readOnlyAccess)),
    ).toThrow(ForbiddenException);
  });

  it('staff writes succeed when the action is held', () => {
    const guard = new AccessGuard(new Reflector());
    const writeAccess = {
      [Module.OPERATOR_PAYMENTS]: {
        reach: Reach.OWN,
        actions: [Action.VIEW, Action.CREATE, Action.PAY, Action.ARCHIVE],
      },
    };

    expect(guard.canActivate(contextFor('create', UserRole.BROKER, writeAccess))).toBe(true);
    expect(guard.canActivate(contextFor('update', UserRole.BROKER, writeAccess))).toBe(true);
    expect(guard.canActivate(contextFor('recordPayment', UserRole.BROKER, writeAccess))).toBe(true);
    expect(guard.canActivate(contextFor('updatePayment', UserRole.BROKER, writeAccess))).toBe(true);
    expect(guard.canActivate(contextFor('remove', UserRole.BROKER, writeAccess))).toBe(true);
    expect(guard.canActivate(contextFor('restore', UserRole.BROKER, writeAccess))).toBe(true);
    expect(guard.canActivate(contextFor('withdrawPayment', UserRole.BROKER, writeAccess))).toBe(true);
    expect(guard.canActivate(contextFor('restorePayment', UserRole.BROKER, writeAccess))).toBe(true);
  });
});
