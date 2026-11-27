import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAircraftSchema, updateAircraftSchema } from './dto/aircraft.dto.js';

afterEach(() => vi.useRealTimers());

describe('aircraft year at request time', () => {
  it('accepts the new year without reloading the schema', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-12-31T12:00:00Z'));
    const create = { tailNumber: 'N123AB', model: 'G550', category: 'HEAVY_JET', yearBuilt: 2027 };
    expect(createAircraftSchema.safeParse(create).success).toBe(false);
    expect(updateAircraftSchema.safeParse({ yearBuilt: 2027 }).success).toBe(false);
    vi.setSystemTime(new Date('2027-01-01T12:00:00Z'));
    expect(createAircraftSchema.safeParse(create).success).toBe(true);
    expect(updateAircraftSchema.safeParse({ yearBuilt: 2027 }).success).toBe(true);
    expect(updateAircraftSchema.safeParse({ yearBuilt: 2028 }).success).toBe(false);
  });

  it('preserves minimum, integer, omitted and cleared-year rules', () => {
    for (const yearBuilt of [1949, 2000.5]) {
      expect(updateAircraftSchema.safeParse({ yearBuilt }).success).toBe(false);
    }
    expect(updateAircraftSchema.parse({ yearBuilt: null })).toEqual({ yearBuilt: null });
    expect(updateAircraftSchema.parse({ notes: 'No year on file' })).not.toHaveProperty('yearBuilt');
  });
});
