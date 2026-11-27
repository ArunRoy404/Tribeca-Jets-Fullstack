import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { resolveAccess } from '../../common/authorization/access.js';
import { CommissionBasis, CommissionStatus, FlightStatus, TripStatus, UserRole } from '../../generated/prisma/enums.js';
import { TripsService } from './trips.service.js';
import { TripLegScalarFieldEnum, TripScalarFieldEnum } from '../../generated/prisma/internal/prismaNamespace.js';

const user = { id: 'owner', role: UserRole.SUPER_ADMIN, email: 'owner@example.com', access: resolveAccess(UserRole.SUPER_ADMIN, null) };

function setup(status: TripStatus = TripStatus.IN_FLIGHT) {
  const current = { id: 'trip', reference: 42, status, approvalStatus: 'APPROVED', operatorId: 'operator',
    operatorConfirmedAt: new Date(), departureDate: new Date('2026-01-01'), passengerCount: 2,
    passengers: [], legs: [{ departureDate: new Date('2026-01-01'), departureTime: '14:30' }] };
  const rows = [CommissionStatus.PENDING, CommissionStatus.PAID, CommissionStatus.CANCELLED].map((commissionStatus, index) => ({
    id: `commission-${index}`, status: commissionStatus, basis: CommissionBasis.FLAT_FEE, amount: 100, finalAmount: null, percentage: null,
    trip: { reference: 42, basePrice: 1000, fetEnabled: false, fetRate: 0, operatorCost: 800, lineItems: [] },
  }));
  const tx = {
    trip: { update: vi.fn() },
    tripLeg: { update: vi.fn(), count: vi.fn().mockResolvedValue(0) },
    commission: {
      findMany: vi.fn(async () => rows.filter((row) => row.status === CommissionStatus.PENDING)),
      updateMany: vi.fn(async ({ where, data }) => {
        const row = rows.find((row) => row.id === where.id && row.status === where.status);
        if (!row) return { count: 0 };
        row.status = data.status;
        return { count: 1 };
      }),
    },
    auditLog: { create: vi.fn() },
  };
  const leg = { id: 'leg', sequence: 1, flightStatus: FlightStatus.IN_FLIGHT, departureDate: new Date('2026-01-01'), trip: current };
  const prisma = { trip: { findFirst: vi.fn((_query: unknown) => Promise.resolve(current)) }, tripLeg: { findFirst: vi.fn().mockResolvedValue(leg) },
    $transaction: vi.fn(async (run) => run(tx)) };
  const service = new TripsService(prisma as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never);
  vi.spyOn(service, 'findOne').mockResolvedValue(current as never);
  vi.spyOn(service, 'flight').mockResolvedValue(leg as never);
  return { service, current, rows, tx, prisma };
}

describe('trip completion earns commissions in both paths', () => {
  it.each(['status', 'flight'] as const)('%s completes and earns only live PENDING commissions in one transaction', async (path) => {
    const { service, rows, tx, prisma } = setup();
    if (path === 'status') await service.changeStatus(user, 'trip', { status: TripStatus.COMPLETED });
    else await service.updateFlight(user, 'leg', { flightStatus: FlightStatus.LANDED });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.trip.update).toHaveBeenCalledWith({ where: { id: 'trip' }, data: { status: TripStatus.COMPLETED, updatedById: user.id } });
    expect(rows.map((row) => row.status)).toEqual(['EARNED', 'PAID', 'CANCELLED']);
    expect(tx.commission.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { tripId: 'trip', deletedAt: null, status: 'PENDING' } }));
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: { actorId: user.id, action: 'commission.earned', entityType: 'Commission',
      entityId: 'commission-0', metadata: { tripReference: 42, amount: 100 } } });
  });

  it('a remaining leg prevents automatic completion', async () => {
    const { service, tx } = setup();
    tx.tripLeg.count.mockResolvedValue(1);
    await service.updateFlight(user, 'leg', { flightStatus: FlightStatus.LANDED });
    expect(tx.trip.update).not.toHaveBeenCalled();
    expect(tx.commission.updateMany).not.toHaveBeenCalled();
  });

  it('counts an unreported leg (no flight status) as not landed', async () => {
    // SQL's `<> 'LANDED'` is never true for NULL; a mocked count hid that, and
    // landing leg 1 of 2 completed the trip and earned its commission.
    const { service, tx } = setup();
    await service.updateFlight(user, 'leg', { flightStatus: FlightStatus.LANDED });
    expect(tx.tripLeg.count).toHaveBeenCalledWith({ where: expect.objectContaining({
      OR: expect.arrayContaining([{ flightStatus: null }, { flightStatus: { not: FlightStatus.LANDED } }]),
    }) });
  });

  it('reopening a trip leaves earned commissions alone', async () => {
    const { service, tx } = setup(TripStatus.COMPLETED);
    await service.changeStatus(user, 'trip', { status: TripStatus.IN_FLIGHT });
    expect(tx.commission.findMany).not.toHaveBeenCalled();
  });

  it('confirmation names every missing requirement in one 400 and reads the first leg in sequence', async () => {
    const { service, current, prisma } = setup(TripStatus.BOOKED);
    Object.assign(current, { operatorId: null, operatorConfirmedAt: null, departureDate: null, passengerCount: null, legs: [] });
    await expect(service.changeStatus(user, 'trip', { status: TripStatus.CONFIRMED })).rejects.toThrow(
      'Before confirming: assign an operator, add a departure date, add passengers, tick Operator confirmed, add a departure time');
    expect(prisma.trip.findFirst).toHaveBeenCalledWith(expect.objectContaining({ select: expect.objectContaining({ legs: expect.objectContaining({ orderBy: { sequence: 'asc' } }) }) }));
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('confirmation accepts an operator-confirmed trip with time and passengers', async () => {
    const { service, tx } = setup(TripStatus.BOOKED);
    await service.changeStatus(user, 'trip', { status: TripStatus.CONFIRMED });
    expect(tx.trip.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'CONFIRMED', updatedById: user.id } }));
  });

  it('booking from a quote cannot bypass the operator tick and departure time', async () => {
    const prisma = { $transaction: vi.fn() };
    const quotes = { bookingSource: vi.fn().mockResolvedValue({ trip: null, operatorId: 'operator',
      originAirportId: 'origin', destinationAirportId: 'destination', departureDate: new Date('2026-01-01'), passengers: 2 }) };
    const service = new TripsService(prisma as never, {} as never, quotes as never, {} as never, {} as never, {} as never, {} as never);
    await expect(service.bookFromQuote(user, 'quote', { status: TripStatus.CONFIRMED })).rejects.toThrow(
      'Before confirming: tick Operator confirmed, add a departure time');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('scope failure stays a 404 before any writes', async () => {
    const { service, prisma } = setup();
    prisma.trip.findFirst.mockResolvedValue(null as never);
    await expect(service.changeStatus(user, 'trip', { status: TripStatus.COMPLETED })).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('latest client trip is live, scoped, deterministic, and contains no money', async () => {
    const { service, prisma } = setup();
    await service.latestForClient({ ...user, role: UserRole.BROKER, access: resolveAccess(UserRole.BROKER, null) }, 'client');
    expect(prisma.trip.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { clientId: 'client', deletedAt: null, OR: [{ assignedBrokerId: user.id }, { assignedBrokerId: null }] },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    }));
    const select = (prisma.trip.findFirst.mock.calls[0]![0] as { select: object }).select;
    expect(select).not.toHaveProperty('basePrice');
    expect(select).not.toHaveProperty('operatorCost');
    // A mocked findFirst accepts any key; the real query 400s on a column the
    // model lacks (B3 asked for TripLeg.arrivalDate, which does not exist).
    const relations = ['assignedBroker', 'operator', 'aircraft', 'legs'];
    expect(Object.keys(select).filter((key) => !relations.includes(key) && !(key in TripScalarFieldEnum))).toEqual([]);
    const legSelect = (select as { legs: { select: object } }).legs.select;
    expect(Object.keys(legSelect).filter((key) => !['originAirport', 'destinationAirport'].includes(key) && !(key in TripLegScalarFieldEnum))).toEqual([]);
  });
});
