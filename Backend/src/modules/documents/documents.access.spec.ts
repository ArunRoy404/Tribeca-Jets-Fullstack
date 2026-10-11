import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import {
  ACCESS_KEY,
  STAFF_ONLY_KEY,
} from '../../common/constants/auth.constants.js';
import { Action, Module, Reach } from '../../common/authorization/access.js';
import { AccessGuard } from '../../common/guards/access.guard.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { DocumentsController } from './documents.controller.js';

const handler = (name: keyof DocumentsController) =>
  DocumentsController.prototype[name] as unknown as object;

const contextFor = (
  name: keyof DocumentsController,
  role: UserRole,
  access: Record<string, { reach: Reach; actions: Action[] }> = {},
) =>
  ({
    getHandler: () => handler(name),
    getClass: () => DocumentsController,
    switchToHttp: () => ({
      getRequest: () => ({
        user: { id: 'u-1', email: 'staff@tribecajets.com', role, access },
      }),
    }),
  }) as never;

describe('Document Vault access (Module #28 review)', () => {
  const reflector = new Reflector();
  const guard = new AccessGuard(reflector);

  describe('DocumentsController class guards', () => {
    it('entire controller carries @StaffOnly()', () => {
      expect(Reflect.getMetadata(STAFF_ONLY_KEY, DocumentsController)).toBe(true);
    });

    it('refuses outside partners (referral agents) with 403 by role', () => {
      const ctx = contextFor('findAll', UserRole.REFERRAL_AGENT);
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('admits staff roles through the class check', () => {
      const ctx = contextFor('findAll', UserRole.BROKER);
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  describe('Open staff reads (no handler-level @RequireAccess)', () => {
    const openReadHandlers: Array<keyof DocumentsController> = [
      'findAll',
      'stats',
      'findOne',
      'file',
    ];

    for (const name of openReadHandlers) {
      it(`${name} carries no @RequireAccess on the route`, () => {
        expect(Reflect.getMetadata(ACCESS_KEY, handler(name))).toBeUndefined();
      });

      it(`${name} allows any authenticated staff member`, () => {
        const ctx = contextFor(name, UserRole.ASSISTANT);
        expect(guard.canActivate(ctx)).toBe(true);
      });
    }
  });

  describe('Granular per-person write actions', () => {
    it('create requires Module.DOCUMENTS with Action.CREATE', () => {
      expect(Reflect.getMetadata(ACCESS_KEY, handler('create'))).toEqual({
        module: Module.DOCUMENTS,
        action: Action.CREATE,
      });
    });

    it('update requires Module.DOCUMENTS with Action.EDIT', () => {
      expect(Reflect.getMetadata(ACCESS_KEY, handler('update'))).toEqual({
        module: Module.DOCUMENTS,
        action: Action.EDIT,
      });
    });

    it('remove requires Module.DOCUMENTS with Action.ARCHIVE', () => {
      expect(Reflect.getMetadata(ACCESS_KEY, handler('remove'))).toEqual({
        module: Module.DOCUMENTS,
        action: Action.ARCHIVE,
      });
    });

    it('removeMany requires Module.DOCUMENTS with Action.ARCHIVE', () => {
      expect(Reflect.getMetadata(ACCESS_KEY, handler('removeMany'))).toEqual({
        module: Module.DOCUMENTS,
        action: Action.ARCHIVE,
      });
    });

    it('restore requires Module.DOCUMENTS with Action.ARCHIVE', () => {
      expect(Reflect.getMetadata(ACCESS_KEY, handler('restore'))).toEqual({
        module: Module.DOCUMENTS,
        action: Action.ARCHIVE,
      });
    });

    it('restoreMany requires Module.DOCUMENTS with Action.ARCHIVE', () => {
      expect(Reflect.getMetadata(ACCESS_KEY, handler('restoreMany'))).toEqual({
        module: Module.DOCUMENTS,
        action: Action.ARCHIVE,
      });
    });
  });

  describe('Guard enforcement on writes', () => {
    it('refuses create when user lacks Action.CREATE', () => {
      const ctx = contextFor('create', UserRole.BROKER, {
        [Module.DOCUMENTS]: { reach: Reach.OWN, actions: [Action.VIEW] },
      });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('allows create when user holds Action.CREATE', () => {
      const ctx = contextFor('create', UserRole.BROKER, {
        [Module.DOCUMENTS]: { reach: Reach.OWN, actions: [Action.CREATE] },
      });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('refuses remove when user lacks Action.ARCHIVE', () => {
      const ctx = contextFor('remove', UserRole.BROKER, {
        [Module.DOCUMENTS]: { reach: Reach.OWN, actions: [Action.VIEW, Action.EDIT] },
      });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('allows remove when user holds Action.ARCHIVE', () => {
      const ctx = contextFor('remove', UserRole.BROKER, {
        [Module.DOCUMENTS]: { reach: Reach.OWN, actions: [Action.ARCHIVE] },
      });
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });
});
