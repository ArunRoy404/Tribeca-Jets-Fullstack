import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { ACCESS_KEY, IS_PUBLIC_KEY, STAFF_ONLY_KEY } from '../../common/constants/auth.constants.js';
import { AccessGuard } from '../../common/guards/access.guard.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { SettingsController } from './settings.controller.js';

const handler = Reflect.get(SettingsController.prototype, 'deskDefaults') as object;
const context = (role: UserRole) => ({
  getHandler: () => handler,
  getClass: () => SettingsController,
  switchToHttp: () => ({ getRequest: () => ({ user: { id: 'user', role, access: {} } }) }),
}) as never;

describe('GET /settings/desk-defaults', () => {
  it('requires a session and staff identity, with no Settings capability', () => {
    expect(Reflect.getMetadata(ACCESS_KEY, handler)).toBeUndefined();
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
    expect(Reflect.getMetadata(STAFF_ONLY_KEY, handler)).toBe(true);
    const guard = new AccessGuard(new Reflector());
    expect(guard.canActivate(context(UserRole.BROKER))).toBe(true);
    expect(guard.canActivate(context(UserRole.ASSISTANT))).toBe(true);
    expect(() => guard.canActivate(context(UserRole.REFERRAL_AGENT))).toThrow(ForbiddenException);
  });
});
