import { describe, expect, it } from 'vitest';
import { CommissionBasis, CommissionStatus } from '../../generated/prisma/enums.js';
import { commissionValue, estimateCommission, tally, termsProblem } from './commissions.amounts.js';

const percent = (percentage: number | null, finalAmount: number | null = null) => ({
  basis: CommissionBasis.PERCENT_OF_PROFIT,
  percentage,
  amount: null,
  finalAmount,
});
const flat = (amount: number | null, finalAmount: number | null = null) => ({
  basis: CommissionBasis.FLAT_FEE,
  percentage: null,
  amount,
  finalAmount,
});

describe('estimateCommission', () => {
  it('takes a share of profit, to the cent', () => {
    expect(estimateCommission(percent(10), 12_345.67)).toBe(1_234.57);
    expect(estimateCommission(percent(12.5), 8_000)).toBe(1_000);
  });

  it('is unknown, not zero, while the profit is unknown', () => {
    expect(estimateCommission(percent(10), null)).toBeNull();
  });

  it('pays nothing on a loss, rather than a negative commission', () => {
    expect(estimateCommission(percent(10), -2_000)).toBe(0);
  });

  it('is the amount itself for a flat fee or a custom figure', () => {
    expect(estimateCommission(flat(1_500), null)).toBe(1_500);
    expect(
      estimateCommission({ basis: CommissionBasis.CUSTOM, percentage: null, amount: 750.5, finalAmount: null }, 9_999),
    ).toBe(750.5);
  });
});

describe('commissionValue', () => {
  it('prefers the settled figure over the estimate', () => {
    expect(commissionValue(percent(10, 900), 12_000)).toBe(900);
    expect(commissionValue(percent(10), 12_000)).toBe(1_200);
  });
});

describe('termsProblem', () => {
  it('asks for the figure the basis uses', () => {
    expect(termsProblem(percent(null))).toMatch(/percentage/);
    expect(termsProblem(flat(null))).toMatch(/amount/);
    expect(termsProblem(percent(10))).toBeNull();
    expect(termsProblem(flat(100))).toBeNull();
  });

  it('refuses the figure the basis does not use', () => {
    expect(termsProblem({ basis: CommissionBasis.FLAT_FEE, percentage: 10, amount: 100 })).toMatch(/not a percentage/);
    expect(termsProblem({ basis: CommissionBasis.PERCENT_OF_PROFIT, percentage: 10, amount: 100 })).toMatch(/not an amount/);
  });
});

describe('tally', () => {
  it('sums by status in cents and leaves cancelled rows out', () => {
    expect(
      tally([
        { status: CommissionStatus.PENDING, value: 0.1 },
        { status: CommissionStatus.PENDING, value: 0.2 },
        { status: CommissionStatus.EARNED, value: 1_000 },
        { status: CommissionStatus.PAID, value: 250.25 },
        { status: CommissionStatus.CANCELLED, value: 5_000 },
        { status: CommissionStatus.PENDING, value: null },
      ]),
    ).toEqual({ pending: 0.3, earned: 1_000, paid: 250.25, unvalued: 1, count: 5 });
  });
});
