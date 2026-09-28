import { describe, expect, it } from 'vitest';
import { EmptyLegStatus } from '../../generated/prisma/enums.js';
import { dayGap, effectiveStatus, matchCounts, matchesFor } from './empty-legs.matching.js';

const day = (value: string) => new Date(`${value}T00:00:00.000Z`);

const leg = {
  originAirportId: 'MIA',
  destinationAirportId: 'TEB',
  departureDate: day('2026-11-12'),
};

const request = (
  id: string,
  route: [string | null, string | null],
  departure: string | null,
  created = '2026-01-01',
) => ({
  id,
  originAirportId: route[0],
  destinationAirportId: route[1],
  departureDate: departure ? day(departure) : null,
  createdAt: new Date(`${created}T12:00:00.000Z`),
});

describe('dayGap', () => {
  it('counts whole days either way', () => {
    expect(dayGap(day('2026-11-12'), day('2026-11-15'))).toBe(3);
    expect(dayGap(day('2026-11-15'), day('2026-11-12'))).toBe(3);
    expect(dayGap(day('2026-11-12'), day('2026-11-12'))).toBe(0);
  });
});

describe('matchesFor', () => {
  it('matches the same route only, in the same direction', () => {
    const matches = matchesFor(leg, [
      request('a', ['MIA', 'TEB'], '2026-03-01'),
      request('b', ['TEB', 'MIA'], '2026-11-12'),
      request('c', ['MIA', 'EWR'], '2026-11-12'),
      request('d', [null, 'TEB'], '2026-11-12'),
    ]);
    expect(matches.map((m) => m.request.id)).toEqual(['a']);
  });

  it('flags requests within three days as date matches, and puts the closest first', () => {
    const matches = matchesFor(leg, [
      request('far', ['MIA', 'TEB'], '2026-03-01', '2026-06-01'),
      request('three', ['MIA', 'TEB'], '2026-11-15'),
      request('one', ['MIA', 'TEB'], '2026-11-11'),
      request('four', ['MIA', 'TEB'], '2026-11-16'),
    ]);
    expect(matches.map((m) => [m.request.id, m.dateMatch])).toEqual([
      ['one', true],
      ['three', true],
      ['far', false],
      ['four', false],
    ]);
  });

  it('keeps a request that named no day, as a route match', () => {
    const [match] = matchesFor(leg, [request('open', ['MIA', 'TEB'], null)]);
    expect(match).toMatchObject({ dayGap: null, dateMatch: false });
  });

  it('orders route-only matches newest enquiry first, then by id', () => {
    const matches = matchesFor(leg, [
      request('b', ['MIA', 'TEB'], null, '2026-02-01'),
      request('a', ['MIA', 'TEB'], null, '2026-02-01'),
      request('c', ['MIA', 'TEB'], null, '2026-05-01'),
    ]);
    expect(matches.map((m) => m.request.id)).toEqual(['c', 'a', 'b']);
  });
});

describe('matchCounts', () => {
  it('counts every route match and the date matches among them', () => {
    expect(
      matchCounts(leg, [
        request('a', ['MIA', 'TEB'], '2026-11-13'),
        request('b', ['MIA', 'TEB'], '2025-11-13'),
        request('c', ['TEB', 'MIA'], '2026-11-13'),
      ]),
    ).toEqual({ matchCount: 2, dateMatchCount: 1 });
  });
});

describe('effectiveStatus', () => {
  const now = new Date('2026-11-10T12:00:00.000Z');
  const past = new Date('2026-11-10T11:00:00.000Z');
  const future = new Date('2026-11-10T13:00:00.000Z');

  it('reads an open leg past its expiry as expired', () => {
    expect(effectiveStatus(EmptyLegStatus.AVAILABLE, past, now)).toBe(EmptyLegStatus.EXPIRED);
    expect(effectiveStatus(EmptyLegStatus.MATCHED, past, now)).toBe(EmptyLegStatus.EXPIRED);
  });

  it('leaves an open leg before its expiry, or with none, as it is', () => {
    expect(effectiveStatus(EmptyLegStatus.AVAILABLE, future, now)).toBe(EmptyLegStatus.AVAILABLE);
    expect(effectiveStatus(EmptyLegStatus.AVAILABLE, null, now)).toBe(EmptyLegStatus.AVAILABLE);
  });

  it('never turns a booked leg into an expired one', () => {
    expect(effectiveStatus(EmptyLegStatus.BOOKED, past, now)).toBe(EmptyLegStatus.BOOKED);
  });
});
