import { describe, expect, it } from 'vitest';
import { TripStatus } from '../../generated/prisma/enums.js';
import { canMove, isEditable, legProblem } from './trips.lifecycle.js';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const C = '33333333-3333-4333-8333-333333333333';
const day = (d: string) => new Date(`${d}T00:00:00.000Z`);

describe('trip status transitions', () => {
  it('walks the charter forward', () => {
    expect(canMove(TripStatus.DRAFT, TripStatus.BOOKED)).toBe(true);
    expect(canMove(TripStatus.BOOKED, TripStatus.CONFIRMED)).toBe(true);
    expect(canMove(TripStatus.CONFIRMED, TripStatus.IN_FLIGHT)).toBe(true);
    expect(canMove(TripStatus.IN_FLIGHT, TripStatus.COMPLETED)).toBe(true);
  });

  it('undoes one step, never skips ahead', () => {
    expect(canMove(TripStatus.CONFIRMED, TripStatus.BOOKED)).toBe(true);
    expect(canMove(TripStatus.COMPLETED, TripStatus.IN_FLIGHT)).toBe(true);
    expect(canMove(TripStatus.DRAFT, TripStatus.COMPLETED)).toBe(false);
    expect(canMove(TripStatus.BOOKED, TripStatus.IN_FLIGHT)).toBe(false);
  });

  it('cancels before departure only, and reopens as a draft', () => {
    expect(canMove(TripStatus.CONFIRMED, TripStatus.CANCELLED)).toBe(true);
    expect(canMove(TripStatus.IN_FLIGHT, TripStatus.CANCELLED)).toBe(false);
    expect(canMove(TripStatus.COMPLETED, TripStatus.CANCELLED)).toBe(false);
    expect(canMove(TripStatus.CANCELLED, TripStatus.DRAFT)).toBe(true);
    expect(canMove(TripStatus.CANCELLED, TripStatus.BOOKED)).toBe(false);
  });

  it('freezes completed and cancelled trips', () => {
    expect(isEditable(TripStatus.CONFIRMED)).toBe(true);
    expect(isEditable(TripStatus.COMPLETED)).toBe(false);
    expect(isEditable(TripStatus.CANCELLED)).toBe(false);
  });
});

describe('legProblem', () => {
  it('holds each trip type to its leg count', () => {
    expect(legProblem('ONE_WAY', [{ originAirportId: A, destinationAirportId: B }])).toBeNull();
    expect(legProblem('ONE_WAY', [])).toMatch(/exactly one/);
    expect(legProblem('ROUND_TRIP', [{ originAirportId: A, destinationAirportId: B }])).toMatch(/exactly two/);
    expect(legProblem('MULTI_LEG', [{ originAirportId: A, destinationAirportId: B }])).toMatch(/at least two/);
  });

  it('refuses a leg that goes nowhere', () => {
    expect(legProblem('ONE_WAY', [{ originAirportId: A, destinationAirportId: A }])).toMatch(/same airport/);
  });

  it('refuses days that go backwards, and ignores legs without a date', () => {
    const legs = [
      { originAirportId: A, destinationAirportId: B, departureDate: day('2026-10-10') },
      { originAirportId: B, destinationAirportId: C, departureDate: null },
      { originAirportId: C, destinationAirportId: A, departureDate: day('2026-10-08') },
    ];
    expect(legProblem('MULTI_LEG', legs)).toMatch(/Leg 3 departs before/);
    expect(
      legProblem('ROUND_TRIP', [
        { originAirportId: A, destinationAirportId: B, departureDate: day('2026-10-10') },
        { originAirportId: B, destinationAirportId: A, departureDate: day('2026-10-10') },
      ]),
    ).toBeNull();
  });
});
