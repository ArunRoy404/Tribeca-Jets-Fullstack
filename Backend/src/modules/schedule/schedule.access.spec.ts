import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import {
  ACCESS_KEY,
  PERMISSIONS_KEY,
  STAFF_ONLY_KEY,
} from '../../common/constants/auth.constants.js';
import { AccessGuard } from '../../common/guards/access.guard.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { ScheduleController } from './schedule.controller.js';

const handler = (name: keyof ScheduleController) =>
  ScheduleController.prototype[name] as unknown as object;

/** A request context for the guard, as `name` on the schedule controller, called by `role`. */
const contextFor = (name: keyof ScheduleController, role: UserRole) =>
  ({
    getHandler: () => handler(name),
    getClass: () => ScheduleController,
    switchToHttp: () => ({
      getRequest: () => ({
        user: { id: 'u', email: 'x@example.com', role, access: {} },
      }),
    }),
  }) as never;

describe('schedule routes (Schedule review, 11 Oct 2026)', () => {
  it('reads need only a session, nothing from the old matrix', () => {
    for (const name of ['findAll', 'stats', 'calendar'] as const) {
      expect(Reflect.getMetadata(ACCESS_KEY, handler(name)), name).toBeUndefined();
      expect(
        Reflect.getMetadata(PERMISSIONS_KEY, handler(name)),
        name,
      ).toBeUndefined();
    }
  });

  it('controller is marked staff-only', () => {
    expect(Reflect.getMetadata(STAFF_ONLY_KEY, ScheduleController)).toBe(true);
  });

  it('a referral agent cannot read schedule (403)', () => {
    const guard = new AccessGuard(new Reflector());
    expect(() =>
      guard.canActivate(contextFor('findAll', UserRole.REFERRAL_AGENT)),
    ).toThrow(ForbiddenException);
    expect(() =>
      guard.canActivate(contextFor('stats', UserRole.REFERRAL_AGENT)),
    ).toThrow(ForbiddenException);
    expect(() =>
      guard.canActivate(contextFor('calendar', UserRole.REFERRAL_AGENT)),
    ).toThrow(ForbiddenException);
  });

  it('staff can read schedule routes', () => {
    const guard = new AccessGuard(new Reflector());
    for (const role of [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.BROKER,
      UserRole.ASSISTANT,
    ]) {
      expect(guard.canActivate(contextFor('findAll', role))).toBe(true);
      expect(guard.canActivate(contextFor('stats', role))).toBe(true);
      expect(guard.canActivate(contextFor('calendar', role))).toBe(true);
    }
  });
});
