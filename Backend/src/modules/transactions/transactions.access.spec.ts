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
import { TransactionsController } from './transactions.controller.js';
import { TransactionsService } from './transactions.service.js';
import { MovementKind } from '../../common/money/movements.js';

const handler = (name: keyof TransactionsController) =>
  TransactionsController.prototype[name] as unknown as object;

/** A request context for the guard, as `name` on TransactionsController, called with user. */
const contextFor = (
  name: keyof TransactionsController,
  role: UserRole,
  access: Record<string, { reach: Reach; actions: Action[] }> = {},
) =>
  ({
    getHandler: () => handler(name),
    getClass: () => TransactionsController,
    switchToHttp: () => ({
      getRequest: () => ({
        user: { id: 'u-1', email: 'user@example.com', role, access },
      }),
    }),
  }) as never;

describe('transactions routes access (Transactions review, 11 Oct 2026)', () => {
  it('controller is marked staff-only', () => {
    expect(Reflect.getMetadata(STAFF_ONLY_KEY, TransactionsController)).toBe(true);
  });

  it('routes require TRANSACTIONS · VIEW, nothing from the old matrix', () => {
    for (const name of ['findAll', 'stats'] as const) {
      expect(Reflect.getMetadata(ACCESS_KEY, handler(name))).toEqual({
        module: Module.TRANSACTIONS,
        action: Action.VIEW,
        altModule: undefined,
      });
      expect(Reflect.getMetadata(PERMISSIONS_KEY, handler(name))).toBeUndefined();
    }
  });

  it('a referral agent cannot read transactions (403 StaffOnly)', () => {
    const guard = new AccessGuard(new Reflector());
    const access = {
      [Module.TRANSACTIONS]: { reach: Reach.OWN, actions: [Action.VIEW] },
    };
    expect(() =>
      guard.canActivate(contextFor('findAll', UserRole.REFERRAL_AGENT, access)),
    ).toThrow(ForbiddenException);
    expect(() =>
      guard.canActivate(contextFor('stats', UserRole.REFERRAL_AGENT, access)),
    ).toThrow(ForbiddenException);
  });

  it('an assistant without TRANSACTIONS · VIEW is refused (403)', () => {
    const guard = new AccessGuard(new Reflector());
    expect(() =>
      guard.canActivate(contextFor('findAll', UserRole.ASSISTANT, {})),
    ).toThrow(ForbiddenException);
    expect(() =>
      guard.canActivate(contextFor('stats', UserRole.ASSISTANT, {})),
    ).toThrow(ForbiddenException);
  });

  it('staff holding TRANSACTIONS · VIEW can access', () => {
    const guard = new AccessGuard(new Reflector());
    const brokerAccess = {
      [Module.TRANSACTIONS]: { reach: Reach.OWN, actions: [Action.VIEW] },
    };
    expect(guard.canActivate(contextFor('findAll', UserRole.BROKER, brokerAccess))).toBe(true);
    expect(guard.canActivate(contextFor('stats', UserRole.BROKER, brokerAccess))).toBe(true);

    const adminAccess = {
      [Module.TRANSACTIONS]: { reach: Reach.ALL, actions: [Action.VIEW, Action.EXPORT] },
    };
    expect(guard.canActivate(contextFor('findAll', UserRole.ADMIN, adminAccess))).toBe(true);
    expect(guard.canActivate(contextFor('stats', UserRole.ADMIN, adminAccess))).toBe(true);
  });
});

describe('TransactionsService permitted kinds', () => {
  const service = new TransactionsService(
    {} as never,
    {} as never,
    {} as never,
  );

  it('includes only kinds whose modules the user holds VIEW for', () => {
    const permittedMethod = (service as unknown as { permitted: (user: unknown) => Set<MovementKind> }).permitted.bind(service);

    // No access to any money module
    expect(permittedMethod({ access: {} })).toEqual(new Set());

    // Only receivables
    expect(
      permittedMethod({
        access: {
          [Module.RECEIVABLES]: { reach: Reach.ALL, actions: [Action.VIEW] },
        },
      }),
    ).toEqual(new Set([MovementKind.CLIENT_PAYMENT]));

    // Receivables and operator payments
    expect(
      permittedMethod({
        access: {
          [Module.RECEIVABLES]: { reach: Reach.ALL, actions: [Action.VIEW] },
          [Module.OPERATOR_PAYMENTS]: { reach: Reach.ALL, actions: [Action.VIEW] },
        },
      }),
    ).toEqual(new Set([MovementKind.CLIENT_PAYMENT, MovementKind.OPERATOR_PAYMENT]));

    // All three
    expect(
      permittedMethod({
        access: {
          [Module.RECEIVABLES]: { reach: Reach.ALL, actions: [Action.VIEW] },
          [Module.OPERATOR_PAYMENTS]: { reach: Reach.ALL, actions: [Action.VIEW] },
          [Module.COMMISSIONS]: { reach: Reach.ALL, actions: [Action.VIEW] },
        },
      }),
    ).toEqual(
      new Set([
        MovementKind.CLIENT_PAYMENT,
        MovementKind.OPERATOR_PAYMENT,
        MovementKind.COMMISSION,
      ]),
    );
  });
});
