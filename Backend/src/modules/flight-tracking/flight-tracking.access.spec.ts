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
import { FlightTrackingController } from './flight-tracking.controller.js';

const handler = (name: keyof FlightTrackingController) =>
  FlightTrackingController.prototype[name] as unknown as object;

/** A request context for the guard, as `name` on the flight-tracking controller, called by `role`. */
const contextFor = (name: keyof FlightTrackingController, role: UserRole) =>
  ({
    getHandler: () => handler(name),
    getClass: () => FlightTrackingController,
    switchToHttp: () => ({
      getRequest: () => ({
        user: { id: 'u', email: 'x@example.com', role, access: {} },
      }),
    }),
  }) as never;

describe('flight tracking routes (Flight Tracking review, 11 Oct 2026)', () => {
  it('reads need only a session, nothing from the old matrix', () => {
    for (const name of ['findAll', 'stats', 'findOne'] as const) {
      expect(Reflect.getMetadata(ACCESS_KEY, handler(name)), name).toBeUndefined();
      expect(
        Reflect.getMetadata(PERMISSIONS_KEY, handler(name)),
        name,
      ).toBeUndefined();
    }
  });

  it('update requires @RequireAccess(Module.FLIGHT_TRACKING, Action.EDIT)', () => {
    expect(
      Reflect.getMetadata(ACCESS_KEY, handler('update')),
    ).toEqual({
      module: Module.FLIGHT_TRACKING,
      action: Action.EDIT,
      altModule: undefined,
    });
    expect(Reflect.getMetadata(PERMISSIONS_KEY, handler('update'))).toBeUndefined();
  });

  it('controller is marked staff-only', () => {
    expect(Reflect.getMetadata(STAFF_ONLY_KEY, FlightTrackingController)).toBe(true);
  });

  it('a referral agent cannot read flight tracking (403)', () => {
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

  it('staff can read flight tracking routes', () => {
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
