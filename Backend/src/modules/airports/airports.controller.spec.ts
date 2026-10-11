import { describe, expect, it } from 'vitest';
import { ACCESS_KEY, PERMISSIONS_KEY } from '../../common/constants/auth.constants.js';
import { Action, Module } from '../../common/authorization/access.js';
import { AirportsController } from './airports.controller.js';

const handler = (name: keyof AirportsController) =>
  AirportsController.prototype[name] as unknown as object;

/**
 * Owner's rule (8 Oct 2026): every read is open to a signed-in user — about
 * eight forms pick an airport — and every write needs its own Airports
 * permission. This pins both halves, so a decorator added or dropped later
 * fails here rather than in a broker's picker.
 */
describe('airports routes', () => {
  it('reads need only a session', () => {
    for (const name of ['findAll', 'stats', 'countries', 'findOne'] as const) {
      expect(Reflect.getMetadata(ACCESS_KEY, handler(name)), name).toBeUndefined();
      expect(Reflect.getMetadata(PERMISSIONS_KEY, handler(name)), name).toBeUndefined();
    }
  });

  it('each write needs its Airports permission', () => {
    const expected = {
      create: Action.CREATE,
      update: Action.EDIT,
      remove: Action.ARCHIVE,
      removeMany: Action.ARCHIVE,
      restore: Action.ARCHIVE,
      restoreMany: Action.ARCHIVE,
    } as const;
    for (const [name, action] of Object.entries(expected)) {
      expect(Reflect.getMetadata(ACCESS_KEY, handler(name as keyof AirportsController)), name).toEqual({
        module: Module.AIRPORTS,
        action,
      });
    }
  });
});

describe('PATCH /airports validation', () => {
  it('changes a required number but never clears it', async () => {
    const { updateAirportSchema } = await import('./dto/airport.dto.js');
    expect(updateAirportSchema.safeParse({ latitude: 40.85 }).success).toBe(true);
    expect(updateAirportSchema.safeParse({ notes: 'Curfew 23:00' }).success).toBe(true);
    for (const field of ['latitude', 'longitude', 'longestRunwayFt']) {
      expect(updateAirportSchema.safeParse({ [field]: null }).success, field).toBe(false);
      expect(updateAirportSchema.safeParse({ [field]: '' }).success, field).toBe(false);
    }
  });

  it('still clears a genuinely optional field', async () => {
    const { updateAirportSchema } = await import('./dto/airport.dto.js');
    expect(updateAirportSchema.parse({ assignedFbo: null })).toEqual({ assignedFbo: null });
  });
});
