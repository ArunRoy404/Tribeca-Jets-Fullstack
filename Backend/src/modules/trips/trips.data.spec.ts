import { describe, expect, it, vi } from 'vitest';
import { resolveAccess } from '../../common/authorization/access.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { createTripSchema, updateTripSchema } from './dto/trip.dto.js';
import { createTripRequestSchema, updateTripRequestSchema } from '../trip-requests/dto/trip-request.dto.js';
import { queryClientPassengersSchema } from '../clients/dto/client-passengers.dto.js';
import { TripsService } from './trips.service.js';
import { uniquePastPassengers } from './trips.passengers.js';
import { ClientsService } from '../clients/clients.service.js';
import { TripRequestsService } from '../trip-requests/trip-requests.service.js';

const clientId = '11111111-1111-4111-8111-111111111111';
const requestId = '22222222-2222-4222-8222-222222222222';
const leg = { originAirportId: requestId, destinationAirportId: '33333333-3333-4333-8333-333333333333' };
const broker = { id: 'broker', email: 'broker@example.com', role: UserRole.BROKER, access: resolveAccess(UserRole.BROKER, null) };
const admin = { ...broker, role: UserRole.ADMIN, access: resolveAccess(UserRole.ADMIN, null) };

describe('B4 passenger and luggage validation', () => {
  it.each([0, 1001, 1.5])('refuses passenger weight %s on create and edit', (weightLb) => {
    const passengers = [{ fullName: 'Ada Ward', weightLb }];
    expect(createTripSchema.safeParse({ clientId, legs: [leg], passengers }).success).toBe(false);
    expect(updateTripSchema.safeParse({ passengers }).success).toBe(false);
  });

  it.each([1, 1000])('accepts passenger weight boundary %s', (weightLb) => {
    expect(createTripSchema.parse({ clientId, legs: [leg], passengers: [{ fullName: 'Ada', weightLb }] }).passengers[0]?.weightLb).toBe(weightLb);
    expect(updateTripSchema.parse({ passengers: [{ fullName: 'Ada', weightLb }] }).passengers?.[0]?.weightLb).toBe(weightLb);
  });

  it('omits blank weight on create and clears it on edit, never inventing zero', () => {
    expect(createTripSchema.parse({ clientId, legs: [leg], passengers: [{ fullName: 'Ada', weightLb: '' }] }).passengers[0]?.weightLb).toBeUndefined();
    expect(updateTripSchema.parse({ passengers: [{ fullName: 'Ada', weightLb: '' }] }).passengers?.[0]?.weightLb).toBeNull();
    expect(updateTripSchema.parse({ passengers: [{ fullName: 'Ada', weightLb: null }] }).passengers?.[0]?.weightLb).toBeNull();
  });

  for (const [name, create, update, input] of [
    ['trip', createTripSchema, updateTripSchema, { clientId, legs: [leg] }],
    ['request', createTripRequestSchema, updateTripRequestSchema, { clientId }],
  ] as const) {
    it(`${name}: luggage boundaries, create omits and edit clears`, () => {
      for (const [field, min, max] of [['luggageCount', 0, 100], ['luggageWeightLb', 1, 10000]] as const) {
        for (const value of [min, max]) {
          expect(create.parse({ ...input, [field]: value })[field]).toBe(value);
          expect(update.parse({ [field]: value })[field]).toBe(value);
        }
        for (const value of [min - 1, max + 1, 1.5]) {
          expect(create.safeParse({ ...input, [field]: value }).success).toBe(false);
          expect(update.safeParse({ [field]: value }).success).toBe(false);
        }
        expect(create.parse({ ...input, [field]: '' })[field]).toBeUndefined();
        expect(update.parse({ [field]: '' })[field]).toBeNull();
        expect(update.parse({ [field]: null })[field]).toBeNull();
      }
    });
  }
});

describe('B4 saved passengers', () => {
  it('de-duplicates trimmed case-insensitive names and DOB; latest values win, never passport', () => {
    const recent = { id: 'new', fullName: '  Ada Ward  ', dateOfBirth: new Date('1980-01-02'), weightLb: 180, lastTripReference: 'TJ-42', passportNumber: 'SECRET' };
    const result = uniquePastPassengers([
      recent, { ...recent, id: 'old', fullName: 'ada ward', weightLb: 170, lastTripReference: 'TJ-1' },
      { ...recent, id: 'other-dob', dateOfBirth: new Date('1981-01-02') },
      { ...recent, id: 'no-dob', dateOfBirth: null },
      { ...recent, id: 'duplicate-no-dob', fullName: 'ADA WARD', dateOfBirth: null },
    ]);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ id: 'new', fullName: 'Ada Ward', dateOfBirth: recent.dateOfBirth, weightLb: 180, lastTripReference: 'TJ-42' });
    expect(JSON.stringify(result)).not.toContain('passport');
  });

  it('preserves a most-recent blank weight rather than reviving an older value', () => {
    const row = { id: 'new', fullName: 'Ada', dateOfBirth: null, weightLb: null, lastTripReference: 'TJ-42' };
    expect(uniquePastPassengers([row, { ...row, id: 'old', weightLb: 180 }])[0]?.weightLb).toBeNull();
  });

  it('queries only visible live trips/passengers, de-duplicates before search and pagination', async () => {
    const candidates = [
      { id: 'new', fullName: ' Ada ', dateOfBirth: null, weightLb: 180, trip: { reference: 42 } },
      { id: 'old', fullName: 'ada', dateOfBirth: null, weightLb: 170, trip: { reference: 1 } },
      { id: 'next', fullName: 'Grace', dateOfBirth: null, weightLb: null, trip: { reference: 2 } },
    ];
    const findMany = vi.fn().mockResolvedValue(candidates);
    const service = new TripsService({ tripPassenger: { findMany } } as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never);
    const page = await service.pastPassengersForClient(broker, clientId, { page: 2, limit: 1 });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { deletedAt: null, trip: { is: { clientId, deletedAt: null, OR: [{ assignedBrokerId: broker.id }, { assignedBrokerId: null }] } } },
      select: { id: true, fullName: true, dateOfBirth: true, weightLb: true, trip: { select: { reference: true } } },
      orderBy: [{ trip: { departureDate: { sort: 'desc', nulls: 'last' } } }, { trip: { createdAt: 'desc' } }, { tripId: 'desc' }, { sequence: 'asc' }, { id: 'asc' }],
    }));
    expect(page.items).toEqual([{ id: 'next', fullName: 'Grace', dateOfBirth: null, weightLb: null, lastTripReference: 'TJ-2' }]);
    expect(page.meta.total).toBe(2);
    const search = await service.pastPassengersForClient(broker, clientId, { page: 1, limit: 10, search: 'ADA' });
    expect(search.items).toHaveLength(1);
    expect(search.items[0]?.weightLb).toBe(180);
    expect(queryClientPassengersSchema.safeParse({ sortBy: 'passportNumber' }).success).toBe(false);
  });

  it('a trip outside reach contributes nothing even for a client the caller can read', async () => {
    const rows = [{ id: 'secret', assignedBrokerId: 'other', clientId, deletedAt: null, fullName: 'Hidden', dateOfBirth: null, weightLb: 190, trip: { reference: 99 } }];
    const findMany = vi.fn(async ({ where }) => rows.filter((row) => where.trip.is.OR.some((scope: { assignedBrokerId: string | null }) => scope.assignedBrokerId === row.assignedBrokerId)));
    const service = new TripsService({ tripPassenger: { findMany } } as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never);
    expect((await service.pastPassengersForClient(broker, clientId, { page: 1, limit: 10 })).items).toEqual([]);
  });

  it('404s an out-of-scope client before ever reading its trips', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const trips = { pastPassengersForClient: vi.fn() };
    const clients = new ClientsService({ client: { findFirst } } as never, {} as never, trips as never, {} as never, {} as never);
    await expect(clients.passengers(broker, clientId, { page: 1, limit: 10 })).rejects.toMatchObject({ status: 404 });
    expect(findFirst.mock.calls[0]?.[0]?.where).toMatchObject({ id: clientId, assignedBrokerId: broker.id });
    expect(trips.pastPassengersForClient).not.toHaveBeenCalled();
  });
});

describe('B4 Convert to Trip validation', () => {
  it('POST /trips refuses a picked request belonging to another client before writing', async () => {
    const prisma = { tripRequest: { findFirst: vi.fn().mockResolvedValue({ clientId: 'other-client' }) },
      client: { findUnique: vi.fn().mockResolvedValue({ deletedAt: null }) }, $transaction: vi.fn() };
    const requests = new TripRequestsService(prisma as never, {} as never, {} as never, {} as never, {} as never);
    const trips = new TripsService(prisma as never, {} as never, {} as never, requests, { usable: vi.fn() } as never, {} as never, {} as never);
    await expect(trips.create(admin, createTripSchema.parse({ clientId, tripRequestId: requestId, legs: [leg] }))).rejects.toThrow('different client');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('refuses an archived or out-of-reach request, using the request owner scope', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const requests = new TripRequestsService({ tripRequest: { findFirst } } as never, {} as never, {} as never, {} as never, {} as never);
    await expect(requests.assertTripTarget(broker, requestId, clientId)).rejects.toMatchObject({ status: 400 });
    expect(findFirst.mock.calls[0]?.[0]?.where).toEqual({ id: requestId, deletedAt: null, OR: [{ assignedBrokerId: broker.id }, { assignedBrokerId: null }] });
  });
});
