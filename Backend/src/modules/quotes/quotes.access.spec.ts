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
import { QuotesController } from './quotes.controller.js';

const handler = (name: keyof QuotesController) =>
  QuotesController.prototype[name] as unknown as object;

/** A request context for the guard, as `name` on the quotes controller, called by `role`. */
const contextFor = (name: keyof QuotesController, role: UserRole) =>
  ({
    getHandler: () => handler(name),
    getClass: () => QuotesController,
    switchToHttp: () => ({
      getRequest: () => ({
        user: { id: 'u', email: 'x@example.com', role, access: {} },
      }),
    }),
  }) as never;

describe('quotes routes (Quotes review, 10 Oct 2026)', () => {
  it('reads need only a session, nothing from the old matrix', () => {
    for (const name of ['findAll', 'stats', 'findOne', 'versions'] as const) {
      expect(Reflect.getMetadata(ACCESS_KEY, handler(name)), name).toBeUndefined();
      expect(
        Reflect.getMetadata(PERMISSIONS_KEY, handler(name)),
        name,
      ).toBeUndefined();
    }
  });

  it('each write needs its Quotes permission', () => {
    const expected = {
      create: Action.CREATE,
      pricePreview: Action.CREATE,
      suggestPrice: Action.VIEW_MONEY,
      update: Action.EDIT,
      send: Action.SEND,
      approve: Action.EDIT,
      reject: Action.EDIT,
      expire: Action.EDIT,
      reopen: Action.EDIT,
      duplicate: Action.CREATE,
      remove: Action.ARCHIVE,
      removeMany: Action.ARCHIVE,
      restore: Action.ARCHIVE,
      restoreMany: Action.ARCHIVE,
    } as const;

    for (const [name, action] of Object.entries(expected)) {
      expect(
        Reflect.getMetadata(
          ACCESS_KEY,
          handler(name as keyof QuotesController),
        ),
        name,
      ).toEqual({
        module: Module.QUOTES,
        action,
        altModule: undefined,
      });
    }
  });

  it('is staff only: a referral agent is refused even an open read', () => {
    expect(Reflect.getMetadata(STAFF_ONLY_KEY, QuotesController)).toBe(true);
    const guard = new AccessGuard(new Reflector());
    expect(() =>
      guard.canActivate(contextFor('findAll', UserRole.REFERRAL_AGENT)),
    ).toThrow(ForbiddenException);
    expect(guard.canActivate(contextFor('findAll', UserRole.ASSISTANT))).toBe(true);
  });
});
