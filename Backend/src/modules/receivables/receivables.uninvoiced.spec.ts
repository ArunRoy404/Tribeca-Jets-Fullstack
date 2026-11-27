import { describe, expect, it, vi } from 'vitest';
import { resolveAccess } from '../../common/authorization/access.js';
import { InvoiceStatus, UserRole } from '../../generated/prisma/enums.js';
import { ReceivablesService } from './receivables.service.js';

const user = { id: 'broker', email: 'broker@example.com', role: UserRole.BROKER, access: resolveAccess(UserRole.BROKER, null) };

describe('invoice totals owned by Receivables', () => {
  it('counts every live, non-cancelled invoice on the scoped trips and sums base plus FET in cents', async () => {
    const findMany = vi.fn().mockResolvedValue([
      { tripId: 'trip', amount: 10.1, fetAmount: 0.9 },
      { tripId: 'trip', amount: 20, fetAmount: 2 },
    ]);
    const trips = { billingRows: vi.fn().mockResolvedValue([{ id: 'trip', totalPrice: 100 }]) };
    const service = new ReceivablesService({ invoice: { findMany } } as never, {} as never, trips as never, {} as never);
    expect(await service.uninvoiced(user)).toBe(67);
    expect(trips.billingRows).toHaveBeenCalledWith(user);
    expect(findMany).toHaveBeenCalledWith({ where: {
      tripId: { in: ['trip'] }, deletedAt: null,
      status: { not: InvoiceStatus.CANCELLED },
    }, select: { tripId: true, amount: true, fetAmount: true } });
    // The trips are already in the caller's scope; another person's invoice on
    // one of them still counts, or the ceiling could be passed.
    // Archived invoices are excluded at the query boundary, rather than subtracted then hidden.
    expect(findMany.mock.calls[0]?.[0]?.where.deletedAt).toBeNull();
  });

  it('excludes the invoice being edited for the same ceiling calculation', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const service = new ReceivablesService({ invoice: { findMany } } as never, {} as never,
      {} as never, {} as never);
    expect(await service.invoicedCentsByTrip(['trip'], 'edited')).toEqual(new Map());
    expect(findMany.mock.calls[0]?.[0]?.where).toMatchObject({ id: { not: 'edited' }, deletedAt: null });
  });

  it('does not query invoices when there are no eligible trips', async () => {
    const findMany = vi.fn();
    const service = new ReceivablesService({ invoice: { findMany } } as never, {} as never,
      { billingRows: vi.fn().mockResolvedValue([]) } as never, {} as never);
    expect(await service.uninvoiced(user)).toBe(0);
    expect(findMany).not.toHaveBeenCalled();
  });
});
