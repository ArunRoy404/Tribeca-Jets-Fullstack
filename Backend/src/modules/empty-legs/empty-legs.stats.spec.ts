import { describe, expect, it, vi } from 'vitest';
import { EmptyLegStatus } from '../../generated/prisma/enums.js';
import { matchedLegCount } from './empty-legs.matching.js';
import { EmptyLegsService } from './empty-legs.service.js';

const now = new Date('2026-11-27T12:00:00Z');
const route = { originAirportId: 'origin', destinationAirportId: 'destination', departureDate: now };
const request = { ...route, id: 'request', createdAt: now };

describe('live empty-leg match stats', () => {
  it('counts AVAILABLE with a match and excludes stored MATCHED without one', () => {
    expect(matchedLegCount([
      { ...route, status: EmptyLegStatus.AVAILABLE, expiresAt: null },
      { ...route, destinationAirportId: 'other', status: EmptyLegStatus.MATCHED, expiresAt: null },
    ], [request], now)).toBe(1);
  });

  it('does not count lapsed, booked or expired legs, even with matching requests', () => {
    expect(matchedLegCount([
      { ...route, status: EmptyLegStatus.AVAILABLE, expiresAt: now },
      { ...route, status: EmptyLegStatus.BOOKED, expiresAt: null },
      { ...route, status: EmptyLegStatus.EXPIRED, expiresAt: null },
    ], [request], now)).toBe(0);
  });

  it('reads candidates with the caller scope just as the list does, including unpriced open legs', async () => {
    const user = { id: 'broker' };
    const open = [{ ...route, status: EmptyLegStatus.AVAILABLE, expiresAt: null, price: null }];
    const requests = { onRoutes: vi.fn().mockResolvedValue([request]) };
    const findMany = vi.fn().mockResolvedValue(open);
    const service = new EmptyLegsService({ emptyLeg: { count: vi.fn().mockResolvedValue(1), findMany } } as never,
      {} as never, requests as never, {} as never);
    expect(await service.stats(user as never)).toMatchObject({ available: 1, matched: 1, openValue: 0, pricedOpenCount: 0 });
    expect(requests.onRoutes).toHaveBeenCalledWith(user, open);
    expect(findMany.mock.calls[0]?.[0]?.where).not.toHaveProperty('price');
  });
});
