import { describe, expect, it } from 'vitest';
import { MovementKind, movementOrder, type Movement } from '../../common/money/movements.js';
import { mergePages } from '../../common/database/merge-pages.js';
import { kindsFor, ledgerTotals } from './transactions.ledger.js';

const ALL = new Set(Object.values(MovementKind));
const { CLIENT_PAYMENT, OPERATOR_PAYMENT, COMMISSION } = MovementKind;

describe('kindsFor', () => {
  it('reads every kind the caller may see', () => {
    expect(kindsFor(ALL)).toEqual([CLIENT_PAYMENT, OPERATOR_PAYMENT, COMMISSION]);
  });

  it('never reads a kind the caller may not see, whatever was asked for', () => {
    expect(kindsFor(new Set([CLIENT_PAYMENT]), COMMISSION)).toEqual([]);
    expect(kindsFor(new Set([CLIENT_PAYMENT, COMMISSION]))).toEqual([CLIENT_PAYMENT, COMMISSION]);
  });

  it('narrows by direction', () => {
    expect(kindsFor(ALL, undefined, 'OUT')).toEqual([OPERATOR_PAYMENT, COMMISSION]);
    expect(kindsFor(ALL, OPERATOR_PAYMENT, 'IN')).toEqual([]);
  });
});

describe('ledgerTotals', () => {
  it('sums in and out in cents, and nets them', () => {
    const totals = ledgerTotals(
      {
        CLIENT_PAYMENT: { count: 2, cents: 3_000_010, unvalued: 0 },
        OPERATOR_PAYMENT: { count: 1, cents: 2_000_000, unvalued: 0 },
        COMMISSION: { count: 2, cents: 150_000, unvalued: 1 },
      },
      ALL,
    );
    expect(totals).toMatchObject({ moneyIn: 30_000.1, moneyOut: 21_500, net: 8_500.1, count: 5, unvalued: 1 });
    expect(totals.byKind.COMMISSION).toEqual({ count: 2, amount: 1_500, unvalued: 1 });
  });

  it('leaves a side it cannot see null, and the net with it', () => {
    const totals = ledgerTotals({ COMMISSION: { count: 1, cents: 100, unvalued: 0 } }, new Set([COMMISSION]));
    expect(totals).toMatchObject({ moneyIn: null, moneyOut: 1, net: null });
  });
});

describe('movementOrder with mergePages', () => {
  const row = (id: string, day: string, entered: string): Movement => ({
    id,
    kind: CLIENT_PAYMENT,
    direction: 'IN',
    date: new Date(`${day}T00:00:00.000Z`),
    amount: 1,
    method: null,
    reference: null,
    document: { id, number: id },
    counterparty: { type: 'CLIENT', id: null, name: '' },
    trip: null,
    broker: null,
    createdAt: new Date(entered),
  });

  it('pages three sources newest first, breaking same-day ties by entry then id', () => {
    const a = [row('a1', '2026-09-20', '2026-09-20T10:00:00Z'), row('a2', '2026-09-10', '2026-09-10T10:00:00Z')];
    const b = [row('b1', '2026-09-20', '2026-09-21T09:00:00Z')];
    const c = [row('c1', '2026-09-15', '2026-09-15T10:00:00Z')];
    const order = movementOrder('desc');
    expect(mergePages([a, b, c], 0, 2, order).map((r) => r.id)).toEqual(['b1', 'a1']);
    expect(mergePages([a, b, c], 2, 2, order).map((r) => r.id)).toEqual(['c1', 'a2']);
  });

  it('reverses cleanly for oldest first', () => {
    const rows = [[row('x', '2026-09-01', '2026-09-01T00:00:00Z')], [row('y', '2026-09-02', '2026-09-02T00:00:00Z')]];
    expect(mergePages(rows, 0, 2, movementOrder('asc')).map((r) => r.id)).toEqual(['x', 'y']);
  });
});
