import { describe, expect, it, vi } from 'vitest';
import { CommissionBasis, CommissionRecipientType, CommissionStatus, QuoteStatus, TripApprovalStatus, TripStatus, UserRole, UserStatus } from '../../generated/prisma/enums.js';
import { ClientsService } from '../../modules/clients/clients.service.js';
import { CommissionsService } from '../../modules/commissions/commissions.service.js';
import { QuotesService } from '../../modules/quotes/quotes.service.js';
import { TripRequestsService } from '../../modules/trip-requests/trip-requests.service.js';
import { TripsService } from '../../modules/trips/trips.service.js';
import { resolveAccess } from './access.js';

const account = (role: UserRole) => ({ id: 'caller', email: 'caller@example.com', role, access: resolveAccess(role, null) });
const admin = account(UserRole.SUPER_ADMIN);
const selectedId = 'selected-broker';
const reachedWrite = new Error('Reached mocked write');
const terms = { basis: CommissionBasis.FLAT_FEE, amount: 25, status: CommissionStatus.PENDING };

function setup(role: UserRole, status: UserStatus = UserStatus.ACTIVE, deletedAt: Date | null = null) {
  const assignedBrokerId = selectedId;
  const stored = { id: 'record', clientId: 'client', assignedBrokerId, deletedAt: null };
  const commission = { ...terms, id: 'record', brokerId: selectedId, recipientUserId: selectedId, recipientType: CommissionRecipientType.BROKER };
  const table = (row: object) => ({
    findFirst: vi.fn().mockResolvedValue(row),
    create: vi.fn().mockRejectedValue(reachedWrite),
    update: vi.fn().mockRejectedValue(reachedWrite),
  });
  const findBroker = vi.fn(({ where }) => where.id === selectedId && deletedAt === where.deletedAt
    && where.role.in.includes(role) && status !== where.status.not ? { id: selectedId } : null);
  const prisma = {
    user: { findFirst: findBroker },
    client: { ...table(stored), findUnique: vi.fn().mockResolvedValue(stored) },
    trip: table({ ...stored, status: TripStatus.DRAFT, approvalStatus: TripApprovalStatus.APPROVED }),
    tripRequest: table(stored),
    quote: table({ ...stored, status: QuoteStatus.DRAFT, version: 1, basePrice: 100, fetEnabled: false,
      fetRate: 0.075, operatorCost: null, lineItems: [], depositAmount: null }),
    commission: table(commission),
    $transaction: vi.fn(),
  };
  prisma.$transaction.mockImplementation(async (run) => run(prisma));
  const settings = { read: vi.fn().mockResolvedValue({ defaultFetPercent: 7.5, applyFetByDefault: true,
    defaultMarkupPercent: 15, quoteValidityHours: 24, defaultQuoteTerms: null }) };
  const airports = { usable: vi.fn().mockResolvedValue({}) };
  const clients = new ClientsService(prisma as never, {} as never, {} as never, airports as never, settings as never);
  const trips = new TripsService(prisma as never, {} as never, {} as never, {} as never, airports as never, settings as never, {} as never);
  const requests = new TripRequestsService(prisma as never, {} as never, {} as never, airports as never);
  const quotes = new QuotesService(prisma as never, {} as never, airports as never, settings as never);
  const commissions = new CommissionsService(prisma as never, {} as never,
    { commissionTarget: async () => ({ id: 'trip', assignedBrokerId: 'prior-broker' }) } as never);
  const tripInput = { clientId: 'client', type: 'ONE_WAY', status: TripStatus.DRAFT,
    legs: [{ originAirportId: 'origin', destinationAirportId: 'destination' }] };
  const manualRecipient = { recipientType: CommissionRecipientType.MANUAL, recipientName: 'Travel agency' };
  const paths = {
    clients: [() => clients.create(admin, { assignedBrokerId } as never), () => clients.update(admin, 'record', { assignedBrokerId })],
    trips: [() => trips.create(admin, { ...tripInput, assignedBrokerId } as never), () => trips.update(admin, 'record', { assignedBrokerId })],
    tripRequests: [() => requests.create(admin, { clientId: 'client', assignedBrokerId } as never), () => requests.update(admin, 'record', { assignedBrokerId })],
    quotes: [() => quotes.create(admin, { clientId: 'client', basePrice: 100, assignedBrokerId } as never), () => quotes.update(admin, 'record', { assignedBrokerId })],
    commissionBroker: [
      () => commissions.create(admin, { ...terms, ...manualRecipient, tripId: 'trip', brokerId: selectedId } as never),
      () => commissions.update(admin, 'record', { brokerId: selectedId }),
    ],
    commissionRecipient: [
      () => commissions.create(admin, { ...terms, tripId: 'trip', recipientType: CommissionRecipientType.BROKER, recipientUserId: selectedId } as never),
      () => commissions.update(admin, 'record', { recipientUserId: selectedId }),
    ],
  } as const;
  return { paths, findBroker, prisma, trips, requests, quotes, tripInput };
}

describe.each(['clients', 'trips', 'tripRequests', 'quotes', 'commissionBroker', 'commissionRecipient'] as const)('%s broker validation', (name) => {
  it.each([UserRole.ASSISTANT, UserRole.REFERRAL_AGENT])('refuses assigning %s', async (role) => {
    const { paths } = setup(role);
    await expect(paths[name][0]()).rejects.toMatchObject({ status: 400, message: 'That broker does not exist' });
  });

  it.each([UserRole.BROKER, UserRole.ADMIN])('accepts %s, including while invited', async (role) => {
    for (const status of [UserStatus.ACTIVE, UserStatus.INVITED]) {
      const { paths } = setup(role, status);
      await expect(paths[name][0]()).rejects.toBe(reachedWrite);
    }
  });

  it('rejects suspended or archived brokers on create and skips the unchanged link on edit', async () => {
    const { paths, findBroker } = setup(UserRole.BROKER, UserStatus.SUSPENDED);
    await expect(paths[name][0]()).rejects.toMatchObject({ status: 400 });
    findBroker.mockClear();
    await expect(paths[name][1]()).rejects.toBe(reachedWrite);
    expect(findBroker).not.toHaveBeenCalled();
    const archived = setup(UserRole.BROKER, UserStatus.ACTIVE, new Date());
    await expect(archived.paths[name][0]()).rejects.toMatchObject({ status: 400 });
  });
});

it.each([[UserRole.ASSISTANT, null], [UserRole.BROKER, 'caller']] as const)(
  'uses the correct implicit broker for %s when creating a trip, request or quote',
  async (role, assignedBrokerId) => {
    const { prisma, trips, requests, quotes, tripInput, findBroker } = setup(UserRole.BROKER);
    const user = account(role);
    await expect(trips.create(user, tripInput as never)).rejects.toBe(reachedWrite);
    await expect(requests.create(user, { clientId: 'client' } as never)).rejects.toBe(reachedWrite);
    await expect(quotes.create(user, { clientId: 'client', basePrice: 100 } as never)).rejects.toBe(reachedWrite);
    for (const table of [prisma.trip, prisma.tripRequest, prisma.quote]) {
      expect(table.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ assignedBrokerId }) }));
    }
    expect(findBroker).not.toHaveBeenCalled();
  },
);
