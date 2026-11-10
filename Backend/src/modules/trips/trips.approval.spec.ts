import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import {
  Action,
  Module,
  Reach,
  allowedActions,
  defaultGrants,
  normaliseGrants,
  resolveAccess,
} from '../../common/authorization/access.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import {
  TaskStatus,
  TripApprovalStatus,
  TripStatus,
  UserRole,
} from '../../generated/prisma/enums.js';
import {
  approveBlockedBy,
  confirmBlockedBy,
  createBlockedBy,
  initialApproval,
  rejectBlockedBy,
  resubmits,
} from './trips.approval.js';
import { TripsService } from './trips.service.js';

const { PENDING, APPROVED, REJECTED } = TripApprovalStatus;

describe('trip approval rules (client feedback 2.1, fixed 10 Nov 2026)', () => {
  it('a trip starts approved only when its creator may approve', () => {
    expect(initialApproval(true)).toBe(APPROVED);
    expect(initialApproval(false)).toBe(PENDING);
  });

  it('only an approved trip may be confirmed — a declined one is held too', () => {
    expect(confirmBlockedBy(APPROVED)).toBeNull();
    expect(confirmBlockedBy(PENDING)).toMatch(/waiting for approval/);
    expect(confirmBlockedBy(REJECTED)).toMatch(/declined/);
  });

  it('creating a trip as CONFIRMED needs the right to approve it', () => {
    expect(createBlockedBy(TripStatus.CONFIRMED, false)).toMatch(/Booked instead/);
    expect(createBlockedBy(TripStatus.CONFIRMED, true)).toBeNull();
    expect(createBlockedBy(TripStatus.BOOKED, false)).toBeNull();
    expect(createBlockedBy(TripStatus.DRAFT, false)).toBeNull();
  });

  it('approves a pending or declined trip, never an approved one', () => {
    expect(approveBlockedBy(PENDING)).toBeNull();
    expect(approveBlockedBy(REJECTED)).toBeNull();
    expect(approveBlockedBy(APPROVED)).toMatch(/already approved/);
  });

  it('declines only a trip waiting for a decision', () => {
    expect(rejectBlockedBy(PENDING)).toBeNull();
    expect(rejectBlockedBy(APPROVED)).toMatch(/already approved/);
    expect(rejectBlockedBy(REJECTED)).toMatch(/already been declined/);
  });

  it('an edit resubmits a declined trip, unless it only ticks the checklist', () => {
    expect(resubmits(REJECTED, false, ['legs', 'operatorId'])).toBe(true);
    expect(resubmits(REJECTED, false, ['contractSent', 'internalNotes'])).toBe(true);
    expect(resubmits(REJECTED, false, ['contractSent'])).toBe(false);
    expect(resubmits(REJECTED, false, ['operatorConfirmed', 'operatorPaymentReceived'])).toBe(false);
    // An approver editing a declined trip decides it with Approve instead.
    expect(resubmits(REJECTED, true, ['legs'])).toBe(false);
    expect(resubmits(PENDING, false, ['legs'])).toBe(false);
    expect(resubmits(APPROVED, false, ['legs'])).toBe(false);
  });
});

describe('Trips · Approve trips is a permission, not a role', () => {
  it('administrators start with it; brokers, assistants and partners can never hold it', () => {
    expect(defaultGrants(UserRole.ADMIN)[Module.TRIPS]).toContain(Action.APPROVE);
    expect(resolveAccess(UserRole.SUPER_ADMIN, null)[Module.TRIPS]?.actions).toContain(Action.APPROVE);
    for (const role of [UserRole.BROKER, UserRole.ASSISTANT, UserRole.REFERRAL_AGENT]) {
      expect(allowedActions(role, Module.TRIPS), role).not.toContain(Action.APPROVE);
    }
  });

  it('refuses granting it to a broker', () => {
    expect(() =>
      normaliseGrants(UserRole.BROKER, { [Module.TRIPS]: [Action.VIEW, Action.APPROVE] }),
    ).toThrow(BadRequestException);
  });

  it('an admin whose set drops it stops approving', () => {
    const access = resolveAccess(UserRole.ADMIN, { [Module.TRIPS]: [Action.VIEW, Action.EDIT] });
    expect(access[Module.TRIPS]?.actions).not.toContain(Action.APPROVE);
  });
});

// ---------------------------------------------------------------------------
// The service, with the database mocked: the gates must hold where a request
// actually lands, not only in the pure functions above.

function makeUser(role: UserRole, trips: Action[]): AuthenticatedUser {
  return {
    id: `user-${role.toLowerCase()}`,
    email: `${role.toLowerCase()}@example.com`,
    role,
    access: { [Module.TRIPS]: { reach: Reach.ALL, actions: trips } },
  };
}

const broker = makeUser(UserRole.BROKER, [Action.VIEW, Action.CREATE, Action.EDIT]);
const approver = makeUser(UserRole.ADMIN, [Action.VIEW, Action.CREATE, Action.EDIT, Action.APPROVE]);

const liveTrip = (overrides: Record<string, unknown> = {}) => ({
  id: 'trip-1',
  reference: 42,
  status: TripStatus.BOOKED,
  type: 'ONE_WAY',
  clientId: 'client-1',
  assignedBrokerId: broker.id,
  createdById: broker.id,
  approvalStatus: PENDING,
  tripRequestId: null,
  operatorId: 'operator-1',
  aircraftId: null,
  operatorConfirmedAt: null,
  contractSentAt: null,
  contractReceivedAt: null,
  operatorPaymentReceivedAt: null,
  departureDate: new Date('2030-01-01T00:00:00Z'),
  passengerCount: 4,
  legs: [],
  passengers: [],
  ...overrides,
});

function makeService(trip: ReturnType<typeof liveTrip>) {
  const tx = { trip: { update: vi.fn() } };
  const prisma = {
    trip: { findFirst: vi.fn().mockResolvedValue(trip), update: vi.fn() },
    task: { create: vi.fn(), updateMany: vi.fn() },
    user: { findUnique: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([]) },
    client: { findUnique: vi.fn().mockResolvedValue({ firstName: 'Ada', lastName: 'Ward', companyName: null }) },
    $transaction: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const audit = { record: vi.fn() };
  const mail = {
    sendTripApprovalNotification: vi.fn().mockResolvedValue(undefined),
    sendTripApprovalDecisionNotice: vi.fn().mockResolvedValue(undefined),
  };
  const service = new TripsService(
    prisma as never,
    audit as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    mail as never,
  );
  vi.spyOn(service, 'findOne').mockResolvedValue({} as never);
  return { service, prisma, tx, audit, mail };
}

/** `notifyApprovers` is private; the resubmit tests only need to know it fired. */
const spyOnNotify = (service: TripsService) =>
  vi
    .spyOn(service as unknown as { notifyApprovers: () => Promise<void> }, 'notifyApprovers')
    .mockResolvedValue(undefined);

describe('TripsService approval gates', () => {
  it('refuses to confirm a pending trip', async () => {
    const { service, prisma } = makeService(liveTrip({ approvalStatus: PENDING }));
    await expect(service.changeStatus(approver, 'trip-1', { status: TripStatus.CONFIRMED })).rejects.toThrow(
      /waiting for approval/,
    );
    expect(prisma.trip.update).not.toHaveBeenCalled();
  });

  it('refuses to confirm a declined trip — the hole the 9 Nov build left open', async () => {
    const { service, prisma } = makeService(liveTrip({ approvalStatus: REJECTED }));
    await expect(service.changeStatus(approver, 'trip-1', { status: TripStatus.CONFIRMED })).rejects.toThrow(
      /declined/,
    );
    expect(prisma.trip.update).not.toHaveBeenCalled();
  });

  it('confirms an approved trip', async () => {
    const { service, prisma } = makeService(liveTrip({ approvalStatus: APPROVED }));
    await service.changeStatus(broker, 'trip-1', { status: TripStatus.CONFIRMED });
    expect(prisma.trip.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: TripStatus.CONFIRMED }) }),
    );
  });

  it('refuses a broker creating a trip straight into CONFIRMED, before touching the database', async () => {
    const { service, prisma } = makeService(liveTrip());
    await expect(
      service.create(broker, { status: TripStatus.CONFIRMED } as never),
    ).rejects.toThrow(/Booked instead/);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('refuses a broker booking a quote straight into CONFIRMED', async () => {
    const { service } = makeService(liveTrip());
    await expect(
      service.bookFromQuote(broker, 'quote-1', { status: TripStatus.CONFIRMED }),
    ).rejects.toThrow(/Booked instead/);
  });

  it('declines only a pending trip', async () => {
    const { service, prisma } = makeService(liveTrip({ approvalStatus: APPROVED, status: TripStatus.CONFIRMED }));
    await expect(service.reject(approver, 'trip-1', { reason: 'Too late' })).rejects.toThrow(/already approved/);
    expect(prisma.trip.update).not.toHaveBeenCalled();
  });

  it('declining records the reason and sets REJECTED', async () => {
    const { service, prisma, audit } = makeService(liveTrip({ approvalStatus: PENDING }));
    await service.reject(approver, 'trip-1', { reason: 'Wrong aircraft' });
    expect(prisma.trip.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ approvalStatus: REJECTED, rejectionReason: 'Wrong aircraft' }),
      }),
    );
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'trip.rejected' }));
  });

  it('approves a declined trip and closes its declined task', async () => {
    const { service, prisma } = makeService(liveTrip({ approvalStatus: REJECTED }));
    await service.approve(approver, 'trip-1');
    expect(prisma.trip.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ approvalStatus: APPROVED, rejectionReason: null }) }),
    );
    expect(prisma.task.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([{ title: 'Trip TJ-42 Approval Declined' }]),
        }),
      }),
    );
  });

  it('a broker editing a declined trip sends it back for approval', async () => {
    const { service, tx, audit, prisma } = makeService(liveTrip({ approvalStatus: REJECTED }));
    const notify = spyOnNotify(service);
    await service.update(broker, 'trip-1', { internalNotes: 'Switched to a midsize' });
    expect(tx.trip.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ approvalStatus: PENDING, rejectionReason: null }),
      }),
    );
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'trip.resubmitted' }));
    expect(prisma.task.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ title: 'Trip TJ-42 Approval Declined', status: TaskStatus.TODO }),
      }),
    );
    expect(notify).toHaveBeenCalledOnce();
  });

  it('ticking a checklist item on a declined trip does not resubmit it', async () => {
    const { service, tx } = makeService(liveTrip({ approvalStatus: REJECTED }));
    const notify = spyOnNotify(service);
    await service.update(broker, 'trip-1', { contractSent: true });
    const data = tx.trip.update.mock.calls[0][0].data;
    expect(data.approvalStatus).toBeUndefined();
    expect(notify).not.toHaveBeenCalled();
  });

  it('notifies exactly the people who hold Trips · Approve, never the submitter', async () => {
    const { service, prisma, mail } = makeService(liveTrip());
    prisma.user.findMany.mockResolvedValue([
      // An admin on role defaults: holds it.
      { id: 'a1', email: 'a1@example.com', firstName: 'Ann', lastName: 'A', role: UserRole.ADMIN, permissions: null },
      // An admin whose set dropped it: does not.
      {
        id: 'a2',
        email: 'a2@example.com',
        firstName: 'Bo',
        lastName: 'B',
        role: UserRole.ADMIN,
        permissions: { [Module.TRIPS]: [Action.VIEW, Action.EDIT] },
      },
      // A broker can never hold it, whatever is stored.
      {
        id: 'b1',
        email: 'b1@example.com',
        firstName: 'Cy',
        lastName: 'C',
        role: UserRole.BROKER,
        permissions: { [Module.TRIPS]: [Action.VIEW, Action.APPROVE] },
      },
    ]);
    await (service as unknown as { notifyApprovers: (...a: unknown[]) => Promise<void> }).notifyApprovers(
      broker,
      'trip-1',
      42,
      'client-1',
    );
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: { not: broker.id } }) }),
    );
    expect(prisma.task.create).toHaveBeenCalledTimes(1);
    expect(prisma.task.create.mock.calls[0][0].data.assigneeId).toBe('a1');
    expect(mail.sendTripApprovalNotification).toHaveBeenCalledTimes(1);
    expect(mail.sendTripApprovalNotification.mock.calls[0][0]).toBe('a1@example.com');
  });
});
