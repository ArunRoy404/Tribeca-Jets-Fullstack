import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ClientStatus, LeadSource, LeadStage, UserRole } from '../../generated/prisma/enums.js';
import { resolveAccess } from '../../common/authorization/access.js';
import { ClientsService } from './clients.service.js';
import { TripsService } from '../trips/trips.service.js';
import { createClientSchema, updateClientSchema } from './dto/client.dto.js';

const user = { id: 'owner', role: UserRole.SUPER_ADMIN, email: 'owner@example.com', access: resolveAccess(UserRole.SUPER_ADMIN, null) };
const clientId = '11111111-1111-4111-8111-111111111111';

describe('client lifecycle consequences', () => {
  it.each(Object.values(LeadStage))('sending a quote from %s only advances an earlier lead', async (leadStage) => {
    const tx = { client: { findFirst: vi.fn().mockResolvedValue({ status: ClientStatus.LEAD, leadStage }), updateMany: vi.fn().mockResolvedValue({ count: 1 }) }, auditLog: { create: vi.fn() } };
    const service = new ClientsService({} as never, {} as never, {} as never, {} as never, {} as never);
    await service.advanceOnQuoteSent(tx as never, clientId, user.id);
    if ([LeadStage.NEW, LeadStage.CONTACTED, LeadStage.QUALIFIED, LeadStage.PROPOSAL].includes(leadStage as never)) {
      expect(tx.client.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { leadStage: 'QUOTED', updatedById: user.id } }));
      expect(tx.auditLog.create).toHaveBeenCalledWith({ data: { actorId: user.id, entityType: 'Client', entityId: clientId,
        action: 'client.stage_changed', metadata: { from: { status: 'LEAD', leadStage }, to: { status: 'LEAD', leadStage: 'QUOTED' }, via: 'quote_sent' } } });
    } else {
      expect(tx.client.updateMany).not.toHaveBeenCalled();
      expect(tx.auditLog.create).not.toHaveBeenCalled();
    }
  });
  it('sending does not change an active client', async () => {
    const tx = { client: { findFirst: vi.fn().mockResolvedValue({ status: ClientStatus.ACTIVE, leadStage: LeadStage.NEW }), updateMany: vi.fn() } };
    const service = new ClientsService({} as never, {} as never, {} as never, {} as never, {} as never);
    await service.advanceOnQuoteSent(tx as never, clientId, user.id);
    expect(tx.client.updateMany).not.toHaveBeenCalled();
  });

  it.each([{ status: ClientStatus.LEAD, leadStage: LeadStage.NEW, changes: true },
    { status: ClientStatus.ACTIVE, leadStage: LeadStage.WON, changes: false }])('booking only audits a real change: %j', async ({ status, leadStage, changes }) => {
    const tx = { client: { findUnique: vi.fn().mockResolvedValue({ status, leadStage }), updateMany: vi.fn().mockResolvedValue({ count: 1 }) }, auditLog: { create: vi.fn() } };
    const service = new TripsService({} as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never);
    await (service as unknown as { autoAdvanceClientOnBooking: (tx: unknown, id: string, actor: string, ref: number) => Promise<void> })
      .autoAdvanceClientOnBooking(tx, clientId, user.id, 42);
    expect(tx.client.updateMany).toHaveBeenCalledTimes(changes ? 1 : 0);
    expect(tx.auditLog.create).toHaveBeenCalledTimes(changes ? 1 : 0);
    if (changes) expect(tx.auditLog.create).toHaveBeenCalledWith({ data: { actorId: user.id, entityType: 'Client', entityId: clientId,
      action: 'client.stage_changed', metadata: { from: { status, leadStage }, to: { status: 'ACTIVE', leadStage: 'WON' }, via: 'booking', tripReference: 42 } } });
  });
});

describe('lead source OTHER', () => {
  function setup(source: LeadSource = LeadSource.DIRECT, other: string | null = null) {
    const client = { findFirst: vi.fn().mockResolvedValue({ id: clientId, leadSource: source, leadSourceOther: other }),
      update: vi.fn(async ({ data, select }) => ({ id: clientId, ...data, select })),
      create: vi.fn(async ({ data }) => ({ id: clientId, ...data })) };
    const service = new ClientsService({ client } as never, { record: vi.fn() } as never, {} as never, {} as never,
      { read: vi.fn().mockResolvedValue({}) } as never);
    return { service, client };
  }
  it('create DTO refuses OTHER without a description', () => {
    const result = createClientSchema.safeParse({ firstName: 'Ari', lastName: 'Stone', leadSource: 'OTHER' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(['leadSourceOther']);
  });
  it('service refuses an update to OTHER with blank text and never writes', async () => {
    const { service, client } = setup();
    await expect(service.update(user, clientId, updateClientSchema.parse({ leadSource: 'OTHER', leadSourceOther: ' ' }))).rejects.toBeInstanceOf(BadRequestException);
    expect(client.update).not.toHaveBeenCalled();
  });
  it('keeps OTHER text on an unrelated partial edit and returns it from the select', async () => {
    const { service, client } = setup(LeadSource.OTHER, 'Conference');
    await service.update(user, clientId, { phone: '123' });
    expect(client.update).toHaveBeenCalledWith(expect.objectContaining({ data: { phone: '123', updatedById: user.id }, select: expect.objectContaining({ leadSourceOther: true }) }));
  });
  it('clears the description on a source change away from OTHER, even if resent', async () => {
    const { service, client } = setup(LeadSource.OTHER, 'Conference');
    await service.update(user, clientId, { leadSource: LeadSource.DIRECT, leadSourceOther: 'Conference' });
    expect(client.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ leadSourceOther: null }) }));
  });
  it('trims and stores the description on create', async () => {
    const { service, client } = setup();
    const result = await service.create(user, createClientSchema.parse({ firstName: 'Ari', lastName: 'Stone', leadSource: 'OTHER', leadSourceOther: '  Conference  ' }));
    expect(result).toMatchObject({ leadSourceOther: 'Conference' });
    expect(client.create).toHaveBeenCalledWith(expect.objectContaining({ select: expect.objectContaining({ leadSourceOther: true }) }));
  });
  it('latest-trip lookup follows the client scope check', async () => {
    const prisma = { client: { findFirst: vi.fn().mockResolvedValue(null) } };
    const trips = { latestForClient: vi.fn() };
    const service = new ClientsService(prisma as never, {} as never, trips as never, {} as never, {} as never);
    await expect(service.findOne(user, clientId)).rejects.toBeInstanceOf(NotFoundException);
    expect(trips.latestForClient).not.toHaveBeenCalled();
  });
});
