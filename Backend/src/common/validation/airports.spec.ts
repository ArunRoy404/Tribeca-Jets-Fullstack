import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { assertDifferentAirports } from './airports.js';
import { TripRequestsService } from '../../modules/trip-requests/trip-requests.service.js';
import { QuotesService } from '../../modules/quotes/quotes.service.js';
import { resolveAccess } from '../authorization/access.js';
import { UserRole } from '../../generated/prisma/enums.js';

const user = { id: 'broker', email: 'broker@example.com', role: UserRole.BROKER, access: resolveAccess(UserRole.BROKER, null) };
const message = "Departure and arrival can't be the same airport";

describe('different airports', () => {
  it('refuses an identical pair with a destination field error', () => {
    try {
      assertDifferentAirports('A', 'A');
      expect.fail('Expected a refusal');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toEqual({ message, errors: { destinationAirportId: message } });
    }
  });

  it('accepts distinct or absent airports, including a cleared update value', () => {
    for (const pair of [['A', 'B'], ['A', null], [undefined, 'A'], [null, null]]) {
      expect(() => assertDifferentAirports(pair[0], pair[1])).not.toThrow();
    }
  });

  for (const module of ['requests', 'quotes'] as const) {
    const setup = () => {
      const findFirst = vi.fn().mockResolvedValue({ id: 'row', status: 'DRAFT', originAirportId: 'A', destinationAirportId: 'B' });
      const prisma = { tripRequest: { findFirst, create: vi.fn(), update: vi.fn() }, quote: { findFirst, create: vi.fn(), update: vi.fn() } };
      const service = module === 'requests'
        ? new TripRequestsService(prisma as never, {} as never, {} as never, {} as never, {} as never)
        : new QuotesService(prisma as never, {} as never, {} as never, {} as never, {} as never);
      return { service, prisma };
    };

    it(`${module}: refuses a same-airport create before writing`, async () => {
      const { service, prisma } = setup();
      await expect(service.create(user, { clientId: 'client', source: 'DIRECT', status: 'OPEN', originAirportId: 'A', destinationAirportId: 'A' })).rejects.toThrow(message);
      expect(prisma.tripRequest.create).not.toHaveBeenCalled();
      expect(prisma.quote.create).not.toHaveBeenCalled();
    });

    it.each([{ destinationAirportId: 'A' }, { originAirportId: 'B' }])(`${module}: checks the merged route on a one-field update`, async (patch) => {
      const { service, prisma } = setup();
      await expect(service.update(user, 'row', patch)).rejects.toThrow(message);
      expect(prisma.tripRequest.update).not.toHaveBeenCalled();
      expect(prisma.quote.update).not.toHaveBeenCalled();
    });
  }
});
