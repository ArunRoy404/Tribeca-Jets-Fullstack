import { describe, expect, it, vi } from 'vitest';
import { ReceivablesService } from './receivables.service.js';
import { resolveAccess } from '../../common/authorization/access.js';
import { InvoiceStatus, PaymentMethod, UserRole } from '../../generated/prisma/enums.js';

const user = { id: 'owner', email: 'owner@example.com', role: UserRole.SUPER_ADMIN, access: resolveAccess(UserRole.SUPER_ADMIN, null) };
const invoice = { id: 'invoice', clientId: 'actual-client', reference: 42, createdAt: new Date('2026-01-01T00:00:00Z'), status: InvoiceStatus.SENT, amount: 10000, fetAmount: 0, payments: [] };

function setup() {
  const audit = { record: vi.fn().mockResolvedValue(undefined) };
  const prisma = {
    invoice: { findFirst: vi.fn().mockResolvedValue(invoice), update: vi.fn().mockResolvedValue({}) },
    invoicePayment: {
      create: vi.fn().mockResolvedValue({ id: 'payment' }),
      findFirst: vi.fn().mockResolvedValue({ id: 'payment', amount: '5000.00', method: PaymentMethod.WIRE_TRANSFER }),
      update: vi.fn().mockResolvedValue({}),
    },
  };
  const service = new ReceivablesService(prisma as never, audit as never, {} as never, {} as never);
  vi.spyOn(service, 'findOne').mockResolvedValue({} as never);
  return { service, audit, prisma };
}

describe('payments on the client timeline', () => {
  it('records on the invoice client with exactly number, amount and method, never notes or reference', async () => {
    const { service, audit } = setup();
    await service.recordPayment(user, 'invoice', { amount: 5000, method: PaymentMethod.WIRE_TRANSFER, notes: 'Private bank notes', reference: 'Bank reference' });
    expect(audit.record).toHaveBeenCalledTimes(2);
    expect(audit.record).toHaveBeenLastCalledWith({ actorId: user.id, action: 'client.payment_recorded', entityType: 'Client', entityId: 'actual-client', metadata: { number: 'INV-2026-0042', amount: 5000, method: PaymentMethod.WIRE_TRANSFER } });
  });

  it('withdraws using the stored payment amount and method, with the same exact metadata allowlist', async () => {
    const { service, audit, prisma } = setup();
    await service.withdrawPayment(user, 'invoice', 'payment');
    expect(prisma.invoicePayment.findFirst).toHaveBeenCalledWith({ where: { id: 'payment', invoiceId: 'invoice', deletedAt: null }, select: { id: true, amount: true, method: true } });
    expect(audit.record).toHaveBeenCalledTimes(2);
    expect(audit.record).toHaveBeenLastCalledWith({ actorId: user.id, action: 'client.payment_withdrawn', entityType: 'Client', entityId: 'actual-client', metadata: { number: 'INV-2026-0042', amount: 5000, method: PaymentMethod.WIRE_TRANSFER } });
  });

  it('writes no payment or client event when the invoice refuses a payment', async () => {
    const { service, audit, prisma } = setup();
    await expect(service.recordPayment(user, 'invoice', { amount: 10001, method: PaymentMethod.WIRE_TRANSFER })).rejects.toThrow();
    expect(prisma.invoicePayment.create).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });
});
