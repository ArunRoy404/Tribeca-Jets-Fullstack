import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { ACCESS_KEY, PERMISSIONS_KEY, STAFF_ONLY_KEY } from '../../common/constants/auth.constants.js';
import { Action, Module } from '../../common/authorization/access.js';
import { AccessGuard } from '../../common/guards/access.guard.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { OperatorsController } from './operators.controller.js';
import { createOperatorSchema, updateOperatorSchema } from './dto/operator.dto.js';

const handler = (name: keyof OperatorsController) =>
  OperatorsController.prototype[name] as unknown as object;

/** A request context for the guard, as `name` on the operators controller, called by `role`. */
const contextFor = (name: keyof OperatorsController, role: UserRole) =>
  ({
    getHandler: () => handler(name),
    getClass: () => OperatorsController,
    switchToHttp: () => ({ getRequest: () => ({ user: { id: 'u', email: 'x@example.com', role, access: {} } }) }),
  }) as never;

describe('operators routes (Operators review, 8 Oct 2026)', () => {
  it('reads need only a session, nothing from the old matrix', () => {
    for (const name of ['findAll', 'stats', 'findOne'] as const) {
      expect(Reflect.getMetadata(ACCESS_KEY, handler(name)), name).toBeUndefined();
      expect(Reflect.getMetadata(PERMISSIONS_KEY, handler(name)), name).toBeUndefined();
    }
  });

  it('each write needs its Operators permission', () => {
    const expected = {
      create: Action.CREATE,
      update: Action.EDIT,
      remove: Action.ARCHIVE,
      removeMany: Action.ARCHIVE,
      restore: Action.ARCHIVE,
      restoreMany: Action.ARCHIVE,
    } as const;
    for (const [name, action] of Object.entries(expected)) {
      expect(Reflect.getMetadata(ACCESS_KEY, handler(name as keyof OperatorsController)), name).toEqual({
        module: Module.OPERATORS,
        action,
      });
    }
  });

  it('is staff only: a referral agent is refused even an open read', () => {
    expect(Reflect.getMetadata(STAFF_ONLY_KEY, OperatorsController)).toBe(true);
    const guard = new AccessGuard(new Reflector());
    expect(() => guard.canActivate(contextFor('findAll', UserRole.REFERRAL_AGENT))).toThrow(ForbiddenException);
    expect(guard.canActivate(contextFor('findAll', UserRole.ASSISTANT))).toBe(true);
  });
});

describe('operator fields', () => {
  const base = { name: 'FlexJet', homeBase: 'Cleveland, OH', primaryContact: 'James Miller', contactEmail: 'jm@example.com' };

  it('takes safety as a 0–5 rating, never required', () => {
    expect(createOperatorSchema.parse({ ...base, safetyRating: 4.9 }).safetyRating).toBe(4.9);
    expect(createOperatorSchema.parse(base).safetyRating).toBeUndefined();
    expect(createOperatorSchema.safeParse({ ...base, safetyRating: 7 }).success).toBe(false);
    expect(createOperatorSchema.safeParse({ ...base, safetyRating: 'ARG/US Platinum' }).success).toBe(false);
  });

  it('takes response speed and payment terms only from their choices', () => {
    expect(createOperatorSchema.safeParse({ ...base, responseSpeed: 'FAST', paymentTerms: 'NET_30' }).success).toBe(true);
    expect(createOperatorSchema.safeParse({ ...base, responseSpeed: '< 15 min' }).success).toBe(false);
    expect(createOperatorSchema.safeParse({ ...base, paymentTerms: 'Net 30' }).success).toBe(false);
  });

  it('accepts SUSPENDED', () => {
    expect(createOperatorSchema.safeParse({ ...base, status: 'SUSPENDED' }).success).toBe(true);
  });

  it('lets an edit change, but never clear, what create requires', () => {
    expect(updateOperatorSchema.safeParse({ homeBase: 'Teterboro, NJ' }).success).toBe(true);
    for (const field of ['homeBase', 'primaryContact', 'contactEmail']) {
      expect(updateOperatorSchema.safeParse({ [field]: null }).success, field).toBe(false);
      expect(updateOperatorSchema.safeParse({ [field]: '' }).success, field).toBe(false);
    }
    expect(updateOperatorSchema.parse({ paymentTerms: null, responseSpeed: null, safetyRating: null }))
      .toEqual({ paymentTerms: null, responseSpeed: null, safetyRating: null });
  });
});
