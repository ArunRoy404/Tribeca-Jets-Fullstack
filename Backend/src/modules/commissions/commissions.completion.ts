import type { Prisma } from '../../generated/prisma/client.js';
import { CommissionStatus } from '../../generated/prisma/enums.js';
import { commissionValue } from './commissions.amounts.js';
import { tripFigures } from '../trips/trips.figures.js';

/** Owned by commissions; both trip completion paths share their transaction with it. */
export async function earnOnTripCompletion(tx: Prisma.TransactionClient, tripId: string, actorId: string): Promise<void> {
  const pending = await tx.commission.findMany({
    where: { tripId, deletedAt: null, status: CommissionStatus.PENDING },
    select: {
      id: true, basis: true, percentage: true, amount: true, finalAmount: true,
      trip: { select: { reference: true, basePrice: true, fetEnabled: true, fetRate: true, operatorCost: true, lineItems: true } },
    },
  });
  for (const row of pending) {
    // Conditional update makes concurrent completion attempts earn and audit once.
    const changed = await tx.commission.updateMany({
      where: { id: row.id, deletedAt: null, status: CommissionStatus.PENDING },
      data: { status: CommissionStatus.EARNED, updatedById: actorId },
    });
    if (!changed.count) continue;
    await tx.auditLog.create({ data: {
      actorId, action: 'commission.earned', entityType: 'Commission', entityId: row.id,
      metadata: { tripReference: row.trip.reference, amount: commissionValue(row, tripFigures(row.trip)?.grossProfit ?? null) },
    } });
  }
}
