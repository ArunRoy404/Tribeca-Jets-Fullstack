import { describe, expect, it } from 'vitest';
import { queryFlightsSchema, updateFlightSchema } from './flight-tracking.dto.js';

describe('updateFlightSchema', () => {
  it('takes a status, an arrival estimate, a link and a note', () => {
    const parsed = updateFlightSchema.parse({
      flightStatus: 'DELAYED',
      estimatedArrival: '23:45',
      trackingUrl: 'https://flightaware.com/live/flight/N780EX',
      note: 'Ground hold at VNY, weather',
    });
    expect(parsed).toMatchObject({ flightStatus: 'DELAYED', estimatedArrival: '23:45' });
  });

  it('fills in nothing that was not sent', () => {
    expect(updateFlightSchema.parse({ note: 'Wheels up' })).toEqual({ note: 'Wheels up' });
  });

  it('clears the estimate and the link with null', () => {
    expect(updateFlightSchema.parse({ estimatedArrival: null, trackingUrl: null })).toEqual({
      estimatedArrival: null,
      trackingUrl: null,
    });
  });

  it('refuses a 12-hour time, a link that is not http(s), and an unknown status', () => {
    expect(updateFlightSchema.safeParse({ estimatedArrival: '11:45 PM' }).success).toBe(false);
    expect(updateFlightSchema.safeParse({ trackingUrl: 'javascript:alert(1)' }).success).toBe(false);
    expect(updateFlightSchema.safeParse({ flightStatus: 'LIVE' }).success).toBe(false);
  });

  it('refuses a field it does not take', () => {
    expect(updateFlightSchema.safeParse({ departureTime: '09:00' }).success).toBe(false);
  });
});

describe('queryFlightsSchema', () => {
  it('accepts NONE for flights nobody has reported on', () => {
    expect(queryFlightsSchema.parse({ flightStatus: 'NONE' }).flightStatus).toBe('NONE');
  });

  it('refuses a sort it would ignore', () => {
    expect(queryFlightsSchema.safeParse({ sortBy: 'createdAt' }).success).toBe(false);
  });
});
