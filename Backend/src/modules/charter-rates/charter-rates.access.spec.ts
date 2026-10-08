import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { ACCESS_KEY, PERMISSIONS_KEY } from '../../common/constants/auth.constants.js';
import { Action, Module } from '../../common/authorization/access.js';
import { AircraftCategory, UserRole } from '../../generated/prisma/enums.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { AirportsService } from '../airports/airports.service.js';
import { CharterRatesController } from './charter-rates.controller.js';
import { CharterRatesService } from './charter-rates.service.js';

const user = (role: UserRole): AuthenticatedUser => ({ id: 'u1', email: 'x@example.com', role });

/**
 * Owner's decision (8 Oct 2026): the rates and the estimate are money, so
 * they need Quotes · View money — not the open-reads rule; and changing a
 * rate is for an administrator.
 */
describe('charter rates access', () => {
  it('every route needs Quotes · View money, and nothing from the old matrix', () => {
    for (const name of ['findAll', 'estimate', 'set'] as const) {
      const handler = CharterRatesController.prototype[name] as unknown as object;
      expect(Reflect.getMetadata(ACCESS_KEY, handler), name).toEqual({
        module: Module.QUOTES,
        action: Action.VIEW_MONEY,
      });
      expect(Reflect.getMetadata(PERMISSIONS_KEY, handler), name).toBeUndefined();
    }
  });

  it('only an administrator changes a rate', async () => {
    const service = new CharterRatesService({} as never, {} as never, {} as never);
    for (const role of [UserRole.BROKER, UserRole.ASSISTANT, UserRole.REFERRAL_AGENT]) {
      await expect(
        service.set(user(role), AircraftCategory.LIGHT_JET, { hourlyRate: 5000 }),
        role,
      ).rejects.toBeInstanceOf(ForbiddenException);
    }
  });
});

describe('a picked airport', () => {
  const airportsWith = (row: unknown) =>
    new AirportsService({ airport: { findFirst: async () => row } } as never, {} as never, {} as never);

  it('is refused by name when archived', async () => {
    const service = airportsWith({ id: 'a', icao: 'KTEB', name: 'Teterboro', latitude: 40.85, longitude: -74.06, deletedAt: new Date() });
    await expect(service.usable('a', 'origin')).rejects.toThrow(/KTEB has been archived/);
  });

  it('is refused when it does not exist', async () => {
    await expect(airportsWith(null).usable('a', 'destination')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('comes back with numeric coordinates when live', async () => {
    const service = airportsWith({ id: 'a', icao: 'KTEB', name: 'Teterboro', latitude: '40.85', longitude: '-74.06', deletedAt: null });
    await expect(service.usable('a', 'origin')).resolves.toMatchObject({ icao: 'KTEB', latitude: 40.85, longitude: -74.06 });
  });
});
