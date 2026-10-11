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
import { EmailTemplatesController } from './email-templates.controller.js';
import { EmailsController } from './emails.controller.js';

const templateHandler = (name: keyof EmailTemplatesController) =>
  EmailTemplatesController.prototype[name] as unknown as object;

const emailHandler = (name: keyof EmailsController) =>
  EmailsController.prototype[name] as unknown as object;

const contextForTemplate = (
  name: keyof EmailTemplatesController,
  role: UserRole,
  access: Record<string, { reach: Reach; actions: Action[] }> = {},
) =>
  ({
    getHandler: () => templateHandler(name),
    getClass: () => EmailTemplatesController,
    switchToHttp: () => ({
      getRequest: () => ({
        user: { id: 'u-1', email: 'staff@tribecajets.com', role, access },
      }),
    }),
  }) as never;

const contextForEmail = (
  name: keyof EmailsController,
  role: UserRole,
  access: Record<string, { reach: Reach; actions: Action[] }> = {},
) =>
  ({
    getHandler: () => emailHandler(name),
    getClass: () => EmailsController,
    switchToHttp: () => ({
      getRequest: () => ({
        user: { id: 'u-1', email: 'staff@tribecajets.com', role, access },
      }),
    }),
  }) as never;

describe('email templates and sending access (Module #27 review)', () => {
  const reflector = new Reflector();
  const guard = new AccessGuard(reflector);

  describe('EmailTemplatesController', () => {
    it('entire controller carries @StaffOnly()', () => {
      expect(reflector.get(STAFF_ONLY_KEY, EmailTemplatesController)).toBe(true);
    });

    it('refuses outside partners (referral agents) with 403 by role', () => {
      expect(() =>
        guard.canActivate(contextForTemplate('findAll', UserRole.REFERRAL_AGENT)),
      ).toThrow(ForbiddenException);
      expect(() =>
        guard.canActivate(contextForTemplate('create', UserRole.REFERRAL_AGENT)),
      ).toThrow(ForbiddenException);
    });

    it('reads need only a staff session, nothing on the handler', () => {
      for (const name of ['findAll', 'stats', 'fields', 'findOne'] as const) {
        expect(Reflect.getMetadata(ACCESS_KEY, templateHandler(name)), name).toBeUndefined();
        expect(Reflect.getMetadata(PERMISSIONS_KEY, templateHandler(name)), name).toBeUndefined();
      }
    });

    it('each write needs its granular EMAIL_TEMPLATES permission', () => {
      const expected: Record<string, Action> = {
        create: Action.CREATE,
        update: Action.EDIT,
        remove: Action.ARCHIVE,
        restore: Action.ARCHIVE,
        removeMany: Action.ARCHIVE,
        restoreMany: Action.ARCHIVE,
      };

      for (const [name, action] of Object.entries(expected)) {
        expect(
          Reflect.getMetadata(ACCESS_KEY, templateHandler(name as keyof EmailTemplatesController)),
          name,
        ).toEqual({
          module: Module.EMAIL_TEMPLATES,
          action,
        });
      }
    });

    it('allows staff with appropriate action and refuses without it', () => {
      const allowedCtx = contextForTemplate('create', UserRole.ADMIN, {
        [Module.EMAIL_TEMPLATES]: {
          reach: Reach.ALL,
          actions: [Action.VIEW, Action.CREATE],
        },
      });
      expect(guard.canActivate(allowedCtx)).toBe(true);

      const missingCtx = contextForTemplate('create', UserRole.BROKER, {
        [Module.EMAIL_TEMPLATES]: {
          reach: Reach.ALL,
          actions: [Action.VIEW],
        },
      });
      expect(() => guard.canActivate(missingCtx)).toThrow(ForbiddenException);
    });
  });

  describe('EmailsController', () => {
    it('entire controller carries @StaffOnly()', () => {
      expect(reflector.get(STAFF_ONLY_KEY, EmailsController)).toBe(true);
    });

    it('refuses outside partners (referral agents) with 403 by role', () => {
      expect(() =>
        guard.canActivate(contextForEmail('findAll', UserRole.REFERRAL_AGENT)),
      ).toThrow(ForbiddenException);
      expect(() =>
        guard.canActivate(contextForEmail('send', UserRole.REFERRAL_AGENT)),
      ).toThrow(ForbiddenException);
    });

    it('reads and preview need only a staff session, nothing on handler', () => {
      for (const name of ['findAll', 'findOne', 'preview'] as const) {
        expect(Reflect.getMetadata(ACCESS_KEY, emailHandler(name)), name).toBeUndefined();
        expect(Reflect.getMetadata(PERMISSIONS_KEY, emailHandler(name)), name).toBeUndefined();
      }
    });

    it('send requires EMAIL_TEMPLATES · SEND', () => {
      expect(Reflect.getMetadata(ACCESS_KEY, emailHandler('send'))).toEqual({
        module: Module.EMAIL_TEMPLATES,
        action: Action.SEND,
      });
    });

    it('allows staff with SEND and refuses staff without SEND', () => {
      const allowedCtx = contextForEmail('send', UserRole.BROKER, {
        [Module.EMAIL_TEMPLATES]: {
          reach: Reach.ALL,
          actions: [Action.VIEW, Action.SEND],
        },
      });
      expect(guard.canActivate(allowedCtx)).toBe(true);

      const deniedCtx = contextForEmail('send', UserRole.ASSISTANT, {
        [Module.EMAIL_TEMPLATES]: {
          reach: Reach.ALL,
          actions: [Action.VIEW],
        },
      });
      expect(() => guard.canActivate(deniedCtx)).toThrow(ForbiddenException);
    });
  });
});
