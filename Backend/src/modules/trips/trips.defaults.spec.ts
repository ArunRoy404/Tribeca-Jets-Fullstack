import { describe, expect, it, vi } from 'vitest';
import { resolveAccess } from '../../common/authorization/access.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { createTripSchema } from './dto/trip.dto.js';
import { TripsService } from './trips.service.js';

describe('trip create FET defaults', () => {
  it.each([
    [{}, { fetEnabled: false, fetRate: 0.0825 }],
    [{ fetEnabled: true, fetRate: 0 }, { fetEnabled: true, fetRate: 0 }],
    [{ fetEnabled: false }, { fetEnabled: false, fetRate: 0.0825 }],
  ])('takes Settings only for omitted fields: %j', async (input, expected) => {
    const stoppedAtWrite = new Error('Mocked write');
    const trip = { create: vi.fn().mockRejectedValue(stoppedAtWrite) };
    const prisma = { trip, client: { findUnique: vi.fn().mockResolvedValue({ deletedAt: null }) },
      $transaction: vi.fn(async (run) => run({ trip })) };
    const settings = { read: vi.fn().mockResolvedValue({ applyFetByDefault: false, defaultFetPercent: 8.25 }) };
    const service = new TripsService(prisma as never, {} as never, {} as never, {} as never,
      { usable: vi.fn() } as never, settings as never, {} as never);
    const user = { id: 'admin', email: 'admin@example.com', role: UserRole.ADMIN, access: resolveAccess(UserRole.ADMIN, null) };
    const dto = createTripSchema.parse({ clientId: '11111111-1111-4111-8111-111111111111',
      legs: [{ originAirportId: '22222222-2222-4222-8222-222222222222', destinationAirportId: '33333333-3333-4333-8333-333333333333' }], ...input });
    await expect(service.create(user, dto)).rejects.toBe(stoppedAtWrite);
    expect(trip.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining(expected) }));
  });
});
