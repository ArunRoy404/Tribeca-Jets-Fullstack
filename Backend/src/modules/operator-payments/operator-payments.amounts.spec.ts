import { describe, expect, it } from 'vitest';
import { OperatorPayableStatus } from '../../generated/prisma/enums.js';
import {
  PayableState,
  TripOperatorPaymentState,
  payableFigures,
  payableNumber,
  paymentProblem,
  referenceFromSearch,
  tally,
  tripOperatorPayment,
} from './operator-payments.amounts.js';

const TODAY = new Date('2026-09-28T00:00:00.000Z');
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

const bill = (
  overrides: Partial<{
    amount: number | string;
    status: OperatorPayableStatus;
    dueDate: Date | null;
    payments: { amount: number | string }[];
  }> = {},
) => ({
  amount: 48_000,
  status: OperatorPayableStatus.OPEN,
  dueDate: day('2026-10-15'),
  payments: [],
  ...overrides,
});

describe('payableFigures', () => {
  it('nets the payments off the bill', () => {
    expect(payableFigures(bill({ payments: [{ amount: 20_000 }, { amount: '0.50' }] }), TODAY)).toEqual({
      total: 48_000,
      paid: 20_000.5,
      balance: 27_999.5,
      state: PayableState.PARTIALLY_PAID,
    });
  });

  it('is DUE, OVERDUE, PAID and CANCELLED as the payments and dates say', () => {
    expect(payableFigures(bill(), TODAY).state).toBe(PayableState.DUE);
    expect(payableFigures(bill({ dueDate: day('2026-09-27') }), TODAY).state).toBe(PayableState.OVERDUE);
    expect(payableFigures(bill({ dueDate: day('2026-09-01'), payments: [{ amount: 48_000 }] }), TODAY).state).toBe(
      PayableState.PAID,
    );
    expect(payableFigures(bill({ status: OperatorPayableStatus.CANCELLED }), TODAY).state).toBe(PayableState.CANCELLED);
  });
});

describe('paymentProblem', () => {
  it('refuses paying an operator past the bill', () => {
    expect(paymentProblem(4_800_000, 2_000_000, 2_800_001)).toContain('$28,000.00');
    expect(paymentProblem(4_800_000, 2_000_000, 2_800_000)).toBeNull();
  });
});

describe('payableNumber', () => {
  it('reads and writes OP numbers', () => {
    expect(payableNumber(45, new Date('2026-08-01T00:00:00.000Z'))).toBe('OP-2026-0045');
    expect(referenceFromSearch('OP-2026-0045')).toBe(45);
    expect(referenceFromSearch('op45')).toBe(45);
    expect(referenceFromSearch('INV-2026-0045')).toBeNull();
  });
});

describe('tally', () => {
  it('sums open bills, leaves cancelled ones out and counts the week ahead', () => {
    const totals = tally(
      [
        bill({ payments: [{ amount: 8_000 }] }), // due 15 Oct
        bill({ dueDate: day('2026-09-01') }), // overdue
        bill({ amount: 5_000, dueDate: day('2026-10-02') }), // due this week
        bill({ amount: 5_000, dueDate: day('2026-10-05') }), // next week
        bill({ status: OperatorPayableStatus.CANCELLED }),
        bill({ amount: 1_000, dueDate: day('2026-09-29'), payments: [{ amount: 1_000 }] }), // paid, not "due"
      ],
      TODAY,
    );
    expect(totals).toMatchObject({
      payable: 107_000,
      paid: 9_000,
      outstanding: 98_000,
      overdue: 48_000,
      overdueCount: 1,
      dueThisWeek: 1,
      dueThisWeekAmount: 5_000,
      count: 6,
    });
    expect(totals.counts[PayableState.CANCELLED]).toBe(1);
  });
});

describe('tripOperatorPayment', () => {
  it('is NOT_RECORDED with no open bill', () => {
    expect(tripOperatorPayment([bill({ status: OperatorPayableStatus.CANCELLED })], TODAY)).toEqual({
      state: TripOperatorPaymentState.NOT_RECORDED,
      owed: 0,
      paid: 0,
      balance: 0,
      payableCount: 0,
    });
  });

  it('sums across bills', () => {
    expect(
      tripOperatorPayment([bill({ amount: 10_000, payments: [{ amount: 10_000 }] }), bill()], TODAY),
    ).toEqual({ state: TripOperatorPaymentState.PARTIALLY_PAID, owed: 58_000, paid: 10_000, balance: 48_000, payableCount: 2 });
  });
});
