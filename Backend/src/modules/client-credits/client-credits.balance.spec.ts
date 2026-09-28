import { describe, expect, it } from 'vitest';
import { CreditEntryType } from '../../generated/prisma/enums.js';
import {
  balanceAfter,
  directionOf,
  fromCents,
  overdraws,
  summarise,
  toCents,
} from './client-credits.balance.js';

const CREDIT = CreditEntryType.CREDIT;
const APPLICATION = CreditEntryType.APPLICATION;

describe('toCents', () => {
  it('reads a Prisma Decimal, a string and a number the same way', () => {
    // Prisma hands back a Decimal that serialises as a string; a DTO hands
    // over a number. Both are the same money.
    expect(toCents({ toString: () => '18000.00' })).toBe(1_800_000);
    expect(toCents('18000.00' as unknown as number)).toBe(1_800_000);
    expect(toCents(18000)).toBe(1_800_000);
  });

  it('does not lose a cent to floating point', () => {
    // `4.35 * 100` is 434.99999999999994 and `1.005 * 100` is
    // 100.49999999999999 — the precision is gone before any rounding sees it,
    // so multiplying and rounding returns 100 for 1.005. Parsing the text
    // cannot lose anything, because the text is exact.
    expect(toCents(4.35)).toBe(435);
    expect(toCents(1.005)).toBe(101);
    expect(toCents(0.29)).toBe(29);
    expect(toCents('8.07')).toBe(807);
  });

  it('handles a negative, which only the exclude-this-row maths produces', () => {
    expect(toCents(-42.5)).toBe(-4250);
  });

  it('treats missing as nothing rather than NaN', () => {
    expect(toCents(null)).toBe(0);
    expect(toCents(undefined)).toBe(0);
  });
});

describe('summarise', () => {
  it('balances credits against applications', () => {
    expect(summarise(1_800_000, 1_200_000)).toEqual({
      credited: 18000,
      applied: 12000,
      balance: 6000,
    });
  });

  it('reports an untouched account as zero, not as missing', () => {
    expect(summarise(0, 0)).toEqual({ credited: 0, applied: 0, balance: 0 });
  });

  it('keeps cents exact where floating point would not', () => {
    // 0.1 + 0.2 in dollars is 0.30000000000000004. In cents it is 30.
    const cents = [10, 20].reduce((a, b) => a + b, 0);
    expect(summarise(cents, 0).credited).toBe(0.3);
  });
});

describe('directionOf', () => {
  it('is the single place that decides which way money moves', () => {
    expect(directionOf(CREDIT)).toBe(1);
    expect(directionOf(APPLICATION)).toBe(-1);
  });
});

describe('overdraws', () => {
  const at = (balance: number) => balance;

  it('refuses spending more than the account holds', () => {
    expect(overdraws(at(600_000), { type: APPLICATION, amountCents: 700_000 })).toBe(true);
  });

  it('allows spending it exactly to zero', () => {
    // Using a credit up completely is the normal end of one, not an error.
    expect(overdraws(at(600_000), { type: APPLICATION, amountCents: 600_000 })).toBe(false);
  });

  it('never refuses a credit, whatever the balance', () => {
    expect(overdraws(at(0), { type: CREDIT, amountCents: 5_000_000 })).toBe(false);
  });

  it('catches the extra zero, which is the mistake this exists for', () => {
    expect(overdraws(at(1_200_000), { type: APPLICATION, amountCents: 12_000_000 })).toBe(true);
  });

  it('is exact at the cent, not approximate', () => {
    // One cent over is over. A tolerance here would quietly let a ledger drift.
    expect(overdraws(at(600_000), { type: APPLICATION, amountCents: 600_001 })).toBe(true);
  });
});

describe('balanceAfter', () => {
  it('walks a ledger to the same place the sums do', () => {
    // The worked example from the spec: $18,000 credited, $12,000 applied.
    const entries = [
      { type: CREDIT, amountCents: toCents(18000) },
      { type: APPLICATION, amountCents: toCents(12000) },
    ];
    const walked = entries.reduce((balance, e) => balanceAfter(balance, e), 0);
    expect(fromCents(walked)).toBe(6000);
    // And the aggregate agrees, which is the property that matters: the
    // summary endpoint sums, the guard walks, and they must never disagree.
    expect(summarise(toCents(18000), toCents(12000)).balance).toBe(fromCents(walked));
  });
});
