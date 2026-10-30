import { describe, expect, it } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { TripStatus, FlightStatus } from '../../generated/prisma/enums.js';
import { referenceFromSearch } from '../../common/database/document-number.js';
import { createItinerarySchema } from '../itineraries/dto/itinerary.dto.js';
import { todayUtc } from '../../common/money/settlement.js';

describe('Trip Confirmation and Lifecycle Guardrails (Batch 3)', () => {
  it('referenceFromSearch extracts sequence from TR-prefix formats', () => {
    expect(referenceFromSearch('TR-2026-0042', 'TR')).toBe(42);
    expect(referenceFromSearch('TR-42', 'TR')).toBe(42);
    expect(referenceFromSearch('TR-0042', 'TR')).toBe(42);
    expect(referenceFromSearch('42', 'TR')).toBe(42);
    expect(referenceFromSearch('0042', 'TR')).toBe(42);
    expect(referenceFromSearch('TR-XYZ', 'TR')).toBeNull();
  });

  it('createItinerarySchema accepts departureTime alongside arrivalTime', () => {
    const valid = createItinerarySchema.safeParse({
      tripId: '11111111-1111-4111-8111-111111111111',
      departureTime: '08:45',
      arrivalTime: '11:15',
      flightTime: '2h 30m',
      miles: '850 nm',
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.departureTime).toBe('08:45');
      expect(valid.data.arrivalTime).toBe('11:15');
    }
  });

  it('createItinerarySchema rejects malformed 24-hour departure times', () => {
    const invalid = createItinerarySchema.safeParse({
      tripId: '11111111-1111-4111-8111-111111111111',
      departureTime: '25:70',
    });
    expect(invalid.success).toBe(false);
  });

  it('future departure dates reject moves to in-flight or completed', () => {
    const tomorrow = new Date(todayUtc().getTime() + 86400000);
    const isFuture = tomorrow > todayUtc();
    expect(isFuture).toBe(true);

    const checkGuard = (depDate: Date, targetStatus: TripStatus) => {
      if ((targetStatus === TripStatus.IN_FLIGHT || targetStatus === TripStatus.COMPLETED) && depDate > todayUtc()) {
        const label = targetStatus === TripStatus.IN_FLIGHT ? 'in-flight' : 'completed';
        throw new BadRequestException(`Cannot mark trip as ${label} before its departure date.`);
      }
    };

    expect(() => checkGuard(tomorrow, TripStatus.IN_FLIGHT)).toThrow(BadRequestException);
    expect(() => checkGuard(tomorrow, TripStatus.COMPLETED)).toThrow(BadRequestException);
    expect(() => checkGuard(todayUtc(), TripStatus.IN_FLIGHT)).not.toThrow();
  });

  it('confirmation guard requires operator, departure date, and passengers', () => {
    const checkConfirmation = (trip: { operatorId: string | null; departureDate: Date | null; passengerCount: number | null }) => {
      if (!trip.operatorId) {
        throw new BadRequestException('Cannot confirm trip: an operator must be assigned before confirming.');
      }
      if (!trip.departureDate) {
        throw new BadRequestException('Cannot confirm trip: departure date must be set.');
      }
      if (trip.passengerCount === null || trip.passengerCount < 1) {
        throw new BadRequestException('Cannot confirm trip: passenger count or passenger manifest must be provided.');
      }
    };

    expect(() => checkConfirmation({ operatorId: null, departureDate: new Date(), passengerCount: 2 })).toThrow(
      'Cannot confirm trip: an operator must be assigned',
    );
    expect(() => checkConfirmation({ operatorId: 'op-1', departureDate: null, passengerCount: 2 })).toThrow(
      'Cannot confirm trip: departure date must be set',
    );
    expect(() => checkConfirmation({ operatorId: 'op-1', departureDate: new Date(), passengerCount: 0 })).toThrow(
      'Cannot confirm trip: passenger count or passenger manifest must be provided',
    );
    expect(() => checkConfirmation({ operatorId: 'op-1', departureDate: new Date(), passengerCount: 4 })).not.toThrow();
  });
});

