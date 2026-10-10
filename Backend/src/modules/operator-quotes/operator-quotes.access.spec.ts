import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import {
  ACCESS_KEY,
  PERMISSIONS_KEY,
  STAFF_ONLY_KEY,
} from '../../common/constants/auth.constants.js';
import { Action, Module } from '../../common/authorization/access.js';
import { AccessGuard } from '../../common/guards/access.guard.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { OperatorQuotesController } from './operator-quotes.controller.js';

const handler = (name: keyof OperatorQuotesController) =>
  OperatorQuotesController.prototype[name] as unknown as object;

/** A request context for the guard, as `name` on the operator-quotes controller, called by `role`. */
const contextFor = (name: keyof OperatorQuotesController, role: UserRole) =>
  ({
    getHandler: () => handler(name),
    getClass: () => OperatorQuotesController,
    switchToHttp: () => ({
      getRequest: () => ({
        user: { id: 'u', email: 'x@example.com', role, access: {} },
      }),
    }),
  }) as never;

describe('operator-quotes routes (Operator Sourcing review, 10 Oct 2026)', () => {
  it('reads need only a session, nothing from the old matrix', () => {
    for (const name of ['findAll', 'stats', 'findOne'] as const) {
      expect(Reflect.getMetadata(ACCESS_KEY, handler(name)), name).toBeUndefined();
      expect(
        Reflect.getMetadata(PERMISSIONS_KEY, handler(name)),
        name,
      ).toBeUndefined();
    }
  });

  it('each write needs its Operator Sourcing permission', () => {
    const expected = {
      create: Action.CREATE,
      update: Action.EDIT,
      recordResponse: Action.EDIT,
      approve: Action.EDIT,
      reject: Action.EDIT,
      decline: Action.EDIT,
      reopen: Action.EDIT,
      remove: Action.ARCHIVE,
      removeMany: Action.ARCHIVE,
      restore: Action.ARCHIVE,
      restoreMany: Action.ARCHIVE,
    } as const;

    for (const [name, action] of Object.entries(expected)) {
      expect(
        Reflect.getMetadata(
          ACCESS_KEY,
          handler(name as keyof OperatorQuotesController),
        ),
        name,
      ).toEqual({
        module: Module.OPERATOR_SOURCING,
        action,
        altModule: undefined,
      });
    }
  });

  it('is staff only: a referral agent is refused even an open read', () => {
    expect(Reflect.getMetadata(STAFF_ONLY_KEY, OperatorQuotesController)).toBe(true);
    const guard = new AccessGuard(new Reflector());
    expect(() =>
      guard.canActivate(contextFor('findAll', UserRole.REFERRAL_AGENT)),
    ).toThrow(ForbiddenException);
    expect(guard.canActivate(contextFor('findAll', UserRole.ASSISTANT))).toBe(true);
  });
});
