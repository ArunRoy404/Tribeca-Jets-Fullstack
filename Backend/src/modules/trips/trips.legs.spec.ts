import { describe, expect, it } from 'vitest';
import { itineraryTimes } from './trips.legs.js';

describe('itineraryTimes', () => {
  const itinerary = { arrivalTime: '10:12', flightTime: '2h 12m', deletedAt: null };

  it('gives the outbound leg the itinerary times', () => {
    expect(itineraryTimes(1, itinerary)).toEqual({ arrivalTime: '10:12', flightTime: '2h 12m' });
  });

  it('never lends the outbound figures to a later leg', () => {
    expect(itineraryTimes(2, itinerary)).toEqual({ arrivalTime: null, flightTime: null });
  });

  it('reads nothing from a missing or withdrawn itinerary', () => {
    expect(itineraryTimes(1, null)).toEqual({ arrivalTime: null, flightTime: null });
    expect(itineraryTimes(1, { ...itinerary, deletedAt: new Date() })).toEqual({ arrivalTime: null, flightTime: null });
  });
});
