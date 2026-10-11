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
import { ReceivablesController } from './receivables.controller.js';

const handler = (name: keyof ReceivablesController) =>
  ReceivablesController.prototype[name] as unknown as object;

/** A request context for the guard, as `name` on ReceivablesController, called with user. */
const contextFor = (
  name: keyof ReceivablesController,
  role: UserRole,
  access: Record<string, { reach: Reach; actions: Action[] }> = {},
) =>
  ({
    getHandler: () => handler(name),
    getClass: () => ReceivablesController,
    switchToHttp: () => ({
      getRequest: () => ({
        user: { id: 'u-1', email: 'user@example.com', role, access },
      }),
    }),
  }) as never;

describe('receivables routes access (Receivables review, 11 Oct 2026)', () => {
  it('reads need only a session, nothing from the old matrix', () => {
    for (const name of ['findAll', 'stats', 'findOne'] as const) {
      expect(Reflect.getMetadata(ACCESS_KEY, handler(name)), name).toBeUndefined();
      expect(
        Reflect.getMetadata(PERMISSIONS_KEY, handler(name)),
        name,
      ).toBeUndefined();
    }
  });

  it('each write needs its granular RECEIVABLES permission', () => {
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
          handler(name as keyof ReceivablesController),
        ),
        name,
      ).toEqual({
        module: Module.RECEIVABLES,
        action,
        altModule: undefined,
      });
      expect(
        Reflect.getMetadata(
          PERMISSIONS_KEY,
          handler(name as keyof ReceivablesController),
        ),
        name,
      ).toBeUndefined();
    }
  });

  it('controller is marked staff-only', () => {
    expect(Reflect.getMetadata(STAFF_ONLY_KEY, ReceivablesController)).toBe(true);
  });

  it('a referral agent cannot access receivables routes (403 StaffOnly)', () => {
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

  it('staff can read receivables routes', () => {
    const guard = new AccessGuard(new Reflector());
    for (const role of [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.BROKER,
      UserRole.ASSISTANT,
    ]) {
      expect(guard.canActivate(contextFor('findAll', role))).toBe(true);
      expect(guard.canActivate(contextFor('stats', role))).toBe(true);
      expect(guard.canActivate(contextFor('findOne', role))).toBe(true);
    }
  });

  it('broker with default grants can create/pay but cannot archive/void', () => {
    const guard = new AccessGuard(new Reflector());
    const brokerAccess = {
      [Module.RECEIVABLES]: {
        reach: Reach.OWN,
        actions: [Action.VIEW, Action.CREATE, Action.PAY],
      },
    };

    // Permitted writes
    expect(guard.canActivate(contextFor('create', UserRole.BROKER, brokerAccess))).toBe(true);
    expect(guard.canActivate(contextFor('update', UserRole.BROKER, brokerAccess))).toBe(true);
    expect(guard.canActivate(contextFor('recordPayment', UserRole.BROKER, brokerAccess))).toBe(true);
    expect(guard.canActivate(contextFor('updatePayment', UserRole.BROKER, brokerAccess))).toBe(true);

    // Refused writes (require Action.ARCHIVE)
    expect(() =>
      guard.canActivate(contextFor('remove', UserRole.BROKER, brokerAccess)),
    ).toThrow(ForbiddenException);
    expect(() =>
      guard.canActivate(contextFor('restore', UserRole.BROKER, brokerAccess)),
    ).toThrow(ForbiddenException);
    expect(() =>
      guard.canActivate(contextFor('removeMany', UserRole.BROKER, brokerAccess)),
    ).toThrow(ForbiddenException);
    expect(() =>
      guard.canActivate(contextFor('restoreMany', UserRole.BROKER, brokerAccess)),
    ).toThrow(ForbiddenException);
    expect(() =>
      guard.canActivate(contextFor('withdrawPayment', UserRole.BROKER, brokerAccess)),
    ).toThrow(ForbiddenException);
    expect(() =>
      guard.canActivate(contextFor('restorePayment', UserRole.BROKER, brokerAccess)),
    ).toThrow(ForbiddenException);
  });

  it('admin with full access can perform all actions', () => {
    const guard = new AccessGuard(new Reflector());
    const adminAccess = {
      [Module.RECEIVABLES]: {
        reach: Reach.ALL,
        actions: [
          Action.VIEW,
          Action.CREATE,
          Action.PAY,
          Action.ARCHIVE,
          Action.EXPORT,
        ],
      },
    };

    const writeMethods: (keyof ReceivablesController)[] = [
      'create',
      'update',
      'recordPayment',
      'updatePayment',
      'remove',
      'restore',
      'removeMany',
      'restoreMany',
      'withdrawPayment',
      'restorePayment',
    ];

    for (const method of writeMethods) {
      expect(guard.canActivate(contextFor(method, UserRole.ADMIN, adminAccess))).toBe(true);
    }
  });
});
