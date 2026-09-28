import { fromCents } from '../../common/money/cents.js';
import {
  DIRECTION_OF,
  MOVEMENT_KINDS,
  MovementKind,
  type MovementDirection,
  type MovementTotals,
} from '../../common/money/movements.js';

/**
 * The ledger's own decisions, as pure functions: which sources a query reads,
 * and what its totals come to. The rows themselves are built and scoped by
 * the modules that own the money.
 */

/**
 * The kinds a query reads: those the caller may see at all, narrowed by the
 * kind and direction asked for. A kind the caller has no permission for is
 * never read — not read and then hidden.
 */
export function kindsFor(
  permitted: ReadonlySet<MovementKind>,
  kind?: MovementKind,
  direction?: MovementDirection,
): MovementKind[] {
  return MOVEMENT_KINDS.filter(
    (candidate) =>
      permitted.has(candidate) &&
      (kind === undefined || candidate === kind) &&
      (direction === undefined || DIRECTION_OF[candidate] === direction),
  );
}

export interface LedgerTotals {
  /** Money received from clients; null when the caller may not see client payments. */
  moneyIn: number | null;
  /** Money sent to operators and paid in commissions; null when the caller may see neither. */
  moneyOut: number | null;
  /** In less out — null unless both sides are visible, or it would be half a picture. */
  net: number | null;
  count: number;
  byKind: Partial<Record<MovementKind, { count: number; amount: number; unvalued: number }>>;
  /** Paid commissions whose value cannot be known — counted, never summed. */
  unvalued: number;
}

/** Sums each read kind's totals in cents; a kind not read contributes nothing and is absent. */
export function ledgerTotals(
  totals: Partial<Record<MovementKind, MovementTotals>>,
  permitted: ReadonlySet<MovementKind>,
): LedgerTotals {
  const byKind: LedgerTotals['byKind'] = {};
  let inCents = 0;
  let outCents = 0;
  let count = 0;
  let unvalued = 0;
  for (const kind of MOVEMENT_KINDS) {
    const t = totals[kind];
    if (!t) continue;
    byKind[kind] = { count: t.count, amount: fromCents(t.cents), unvalued: t.unvalued };
    count += t.count;
    unvalued += t.unvalued;
    if (DIRECTION_OF[kind] === 'IN') inCents += t.cents;
    else outCents += t.cents;
  }
  const seesIn = permitted.has(MovementKind.CLIENT_PAYMENT);
  const seesOut = permitted.has(MovementKind.OPERATOR_PAYMENT) || permitted.has(MovementKind.COMMISSION);
  return {
    moneyIn: seesIn ? fromCents(inCents) : null,
    moneyOut: seesOut ? fromCents(outCents) : null,
    net: seesIn && seesOut ? fromCents(inCents - outCents) : null,
    count,
    byKind,
    unvalued,
  };
}
