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
import { EmptyLegsController } from './empty-legs.controller.js';

const handler = (name: keyof EmptyLegsController) =>
  EmptyLegsController.prototype[name] as unknown as object;

/** A request context for the guard, as `name` on the empty-legs controller, called by `role`. */
const contextFor = (name: keyof EmptyLegsController, role: UserRole) =>
  ({
    getHandler: () => handler(name),
    getClass: () => EmptyLegsController,
    switchToHttp: () => ({
      getRequest: () => ({
        user: { id: 'u', email: 'x@example.com', role, access: {} },
      }),
    }),
  }) as never;

describe('empty legs routes (Empty Legs review, 11 Oct 2026)', () => {
  it('reads need only a session, nothing from the old matrix', () => {
    for (const name of ['findAll', 'stats', 'findOne'] as const) {
      expect(Reflect.getMetadata(ACCESS_KEY, handler(name)), name).toBeUndefined();
      expect(
        Reflect.getMetadata(PERMISSIONS_KEY, handler(name)),
        name,
      ).toBeUndefined();
    }
  });

  it('each write needs its Empty Legs permission', () => {
    const expected = {
      create: Action.CREATE,
      update: Action.EDIT,
      remove: Action.ARCHIVE,
      restore: Action.ARCHIVE,
      removeMany: Action.ARCHIVE,
      restoreMany: Action.ARCHIVE,
    } as const;

    for (const [name, action] of Object.entries(expected)) {
      expect(
        Reflect.getMetadata(
          ACCESS_KEY,
          handler(name as keyof EmptyLegsController),
        ),
        name,
      ).toEqual({
        module: Module.EMPTY_LEGS,
        action,
        altModule: undefined,
      });
      expect(
        Reflect.getMetadata(
          PERMISSIONS_KEY,
          handler(name as keyof EmptyLegsController),
        ),
        name,
      ).toBeUndefined();
    }
  });

  it('controller is marked staff-only', () => {
    expect(Reflect.getMetadata(STAFF_ONLY_KEY, EmptyLegsController)).toBe(true);
  });

  it('a referral agent cannot access empty legs routes (403)', () => {
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
  });

  it('staff can read empty legs routes', () => {
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
});
