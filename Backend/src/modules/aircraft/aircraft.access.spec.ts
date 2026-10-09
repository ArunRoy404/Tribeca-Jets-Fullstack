import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { ACCESS_KEY, PERMISSIONS_KEY, STAFF_ONLY_KEY } from '../../common/constants/auth.constants.js';
import { Action, Module } from '../../common/authorization/access.js';
import { AccessGuard } from '../../common/guards/access.guard.js';
import { OperatorStatus, UserRole } from '../../generated/prisma/enums.js';
import { AircraftController } from './aircraft.controller.js';
import { createAircraftSchema, updateAircraftSchema } from './dto/aircraft.dto.js';
import { OperatorsService } from '../operators/operators.service.js';

const handler = (name: keyof AircraftController) =>
  AircraftController.prototype[name] as unknown as object;

/** A request context for the guard, as `name` on the aircraft controller, called by `role`. */
const contextFor = (name: keyof AircraftController, role: UserRole) =>
  ({
    getHandler: () => handler(name),
    getClass: () => AircraftController,
    switchToHttp: () => ({ getRequest: () => ({ user: { id: 'u', email: 'x@example.com', role, access: {} } }) }),
  }) as never;

describe('aircraft routes (Aircraft review, 9 Oct 2026)', () => {
  it('reads need only a session, nothing from the old matrix', () => {
    for (const name of ['findAll', 'stats', 'amenities', 'findOne'] as const) {
      expect(Reflect.getMetadata(ACCESS_KEY, handler(name)), name).toBeUndefined();
      expect(Reflect.getMetadata(PERMISSIONS_KEY, handler(name)), name).toBeUndefined();
    }
  });

  it('each write needs its Aircraft permission', () => {
    const expected = {
      create: Action.CREATE,
      update: Action.EDIT,
      remove: Action.ARCHIVE,
      removeMany: Action.ARCHIVE,
      restore: Action.ARCHIVE,
      restoreMany: Action.ARCHIVE,
    } as const;
    for (const [name, action] of Object.entries(expected)) {
      expect(Reflect.getMetadata(ACCESS_KEY, handler(name as keyof AircraftController)), name).toEqual({
        module: Module.AIRCRAFT,
        action,
      });
    }
  });

  it('is staff only: a referral agent is refused even an open read', () => {
    expect(Reflect.getMetadata(STAFF_ONLY_KEY, AircraftController)).toBe(true);
    const guard = new AccessGuard(new Reflector());
    expect(() => guard.canActivate(contextFor('findAll', UserRole.REFERRAL_AGENT))).toThrow(ForbiddenException);
    expect(guard.canActivate(contextFor('findAll', UserRole.ASSISTANT))).toBe(true);
  });
});

describe('operators.usable (Aircraft review, 9 Oct 2026)', () => {
  const operatorsWith = (row: { id: string; name: string; status: OperatorStatus; deletedAt: Date | null } | null) =>
    new OperatorsService(
      { operator: { findFirst: async () => row } } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

  it('resolves active operator', async () => {
    const service = operatorsWith({ id: 'op1', name: 'Jet Aviation', status: OperatorStatus.ACTIVE, deletedAt: null });
    await expect(service.usable('op1', 'operator')).resolves.toMatchObject({ id: 'op1', name: 'Jet Aviation', status: OperatorStatus.ACTIVE });
  });

  it('refuses missing operator with named 400', async () => {
    const service = operatorsWith(null);
    await expect(service.usable('missing', 'operator')).rejects.toThrow(/That operator does not exist/);
  });

  it('refuses archived operator with named 400', async () => {
    const service = operatorsWith({ id: 'op2', name: 'Old Air', status: OperatorStatus.ACTIVE, deletedAt: new Date() });
    await expect(service.usable('op2', 'operator')).rejects.toThrow(/Old Air has been archived/);
  });

  it('refuses suspended operator with named 400', async () => {
    const service = operatorsWith({ id: 'op3', name: 'Bad Air', status: OperatorStatus.SUSPENDED, deletedAt: null });
    await expect(service.usable('op3', 'operator')).rejects.toThrow(/Bad Air is suspended/);
  });
});

describe('aircraft DTO validations', () => {
  const base = {
    tailNumber: 'N780EX',
    model: 'Gulfstream G550',
    category: 'HEAVY_JET',
  };

  it('upper-cases tail numbers and accepts valid characters', () => {
    expect(createAircraftSchema.parse({ ...base, tailNumber: 'n780ex' }).tailNumber).toBe('N780EX');
    expect(createAircraftSchema.parse({ ...base, tailNumber: 'G-ABCD' }).tailNumber).toBe('G-ABCD');
    expect(createAircraftSchema.safeParse({ ...base, tailNumber: 'N!@#' }).success).toBe(false);
  });

  it('update requires at least one field', () => {
    expect(updateAircraftSchema.safeParse({}).success).toBe(false);
    expect(updateAircraftSchema.safeParse({ model: 'G650' }).success).toBe(true);
  });
});
