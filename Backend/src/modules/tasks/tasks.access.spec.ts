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
import { TasksController } from './tasks.controller.js';

const handler = (name: keyof TasksController) =>
  TasksController.prototype[name] as unknown as object;

/** A request context for the guard, as `name` on TasksController, called with user. */
const contextFor = (
  name: keyof TasksController,
  role: UserRole,
  access: Record<string, { reach: Reach; actions: Action[] }> = {},
) =>
  ({
    getHandler: () => handler(name),
    getClass: () => TasksController,
    switchToHttp: () => ({
      getRequest: () => ({
        user: { id: 'u-1', email: 'user@example.com', role, access },
      }),
    }),
  }) as never;

describe('tasks routes access (Tasks Board review, 11 Oct 2026)', () => {
  it('entire controller carries @StaffOnly() and @UseGuards(AccessGuard)', () => {
    const reflector = new Reflector();
    expect(reflector.get(STAFF_ONLY_KEY, TasksController)).toBe(true);
  });

  it('refuses outside partners (referral agents) with 403 by role', () => {
    const guard = new AccessGuard(new Reflector());
    expect(() =>
      guard.canActivate(contextFor('findAll', UserRole.REFERRAL_AGENT)),
    ).toThrow(ForbiddenException);
    expect(() =>
      guard.canActivate(contextFor('create', UserRole.REFERRAL_AGENT)),
    ).toThrow(ForbiddenException);
  });

  it('reads need only a staff session, nothing on the handler', () => {
    for (const name of ['findAll', 'findOne'] as const) {
      expect(Reflect.getMetadata(ACCESS_KEY, handler(name)), name).toBeUndefined();
      expect(
        Reflect.getMetadata(PERMISSIONS_KEY, handler(name)),
        name,
      ).toBeUndefined();
    }
  });

  it('each write needs its granular TASKS permission', () => {
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
          handler(name as keyof TasksController),
        ),
        name,
      ).toEqual({
        module: Module.TASKS,
        action,
      });
    }
  });

  it('lets authorized staff through and refuses when action is missing', () => {
    const guard = new AccessGuard(new Reflector());

    // Super Admin has full reach and actions
    const adminCtx = contextFor('create', UserRole.ADMIN, {
      [Module.TASKS]: {
        reach: Reach.ALL,
        actions: [Action.VIEW, Action.CREATE, Action.EDIT, Action.ARCHIVE],
      },
    });
    expect(guard.canActivate(adminCtx)).toBe(true);

    // Broker with EDIT but missing ARCHIVE throws ForbiddenException
    const brokerCtx = contextFor('remove', UserRole.BROKER, {
      [Module.TASKS]: {
        reach: Reach.ASSIGNED,
        actions: [Action.VIEW, Action.CREATE, Action.EDIT],
      },
    });
    expect(() => guard.canActivate(brokerCtx)).toThrow(ForbiddenException);

    // Broker with ARCHIVE
    const brokerArchiveCtx = contextFor('remove', UserRole.BROKER, {
      [Module.TASKS]: {
        reach: Reach.ASSIGNED,
        actions: [Action.VIEW, Action.CREATE, Action.EDIT, Action.ARCHIVE],
      },
    });
    expect(guard.canActivate(brokerArchiveCtx)).toBe(true);
  });
});
