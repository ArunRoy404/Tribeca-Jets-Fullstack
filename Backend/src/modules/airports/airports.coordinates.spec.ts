import { describe, expect, it } from 'vitest';
import { createAirportSchema, updateAirportSchema } from './dto/airport.dto.js';

describe('airport coordinate field messages', () => {
  const body = { icao: 'KTEB', name: 'Teterboro', city: 'Teterboro', country: 'USA', latitude: 40.85, longitude: -74.06, longestRunwayFt: 7000 };
  it.each([
    ['latitude', -91, 'Latitude must be between -90 and 90'],
    ['latitude', 91, 'Latitude must be between -90 and 90'],
    ['longitude', -181, 'Longitude must be between -180 and 180'],
    ['longitude', 181, 'Longitude must be between -180 and 180'],
  ])('names the range for %s=%s on create and update', (field, value, message) => {
    for (const result of [createAirportSchema.safeParse({ ...body, [field]: value }), updateAirportSchema.safeParse({ [field]: value })]) {
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.issues).toContainEqual(expect.objectContaining({ path: [field], message }));
    }
  });
});
