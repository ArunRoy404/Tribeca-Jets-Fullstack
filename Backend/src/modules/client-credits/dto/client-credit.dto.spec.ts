import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  clientCreditSummarySchema,
  createClientCreditSchema,
  queryClientCreditsSchema,
  updateClientCreditSchema,
} from './client-credit.dto.js';

const CLIENT = '11111111-1111-4111-8111-111111111111';
const base = {
  clientId: CLIENT,
  type: 'CREDIT',
  amount: 18000,
  occurredAt: '2026-03-14',
};

describe('createClientCreditSchema', () => {
  it('takes a movement the desk would actually type', () => {
    const parsed = createClientCreditSchema.parse({
      ...base,
      reason: 'Cancelled KTEB→KMIA, kept on account',
    });
    expect(parsed.amount).toBe(18000);
    expect(parsed.occurredAt).toBeInstanceOf(Date);
  });

  it('refuses a third decimal place', () => {
    // The column is Decimal(12,2), so 1.005 is not a finer amount — it is a
    // value Postgres rounds on the way in, leaving the balance the service
    // checked disagreeing with the row it wrote.
    expect(createClientCreditSchema.safeParse({ ...base, amount: 100.005 }).success).toBe(false);
    expect(createClientCreditSchema.safeParse({ ...base, amount: 100.05 }).success).toBe(true);
  });

  it('refuses a movement of nothing', () => {
    // A zero-amount entry changes no balance and explains nothing, and is a
    // row somebody has to read past for ever.
    expect(createClientCreditSchema.safeParse({ ...base, amount: 0 }).success).toBe(false);
  });

  it('treats an empty amount box as missing, not as zero', () => {
    // `Number('')` is 0, which would post a valid-looking movement of nothing.
    expect(createClientCreditSchema.safeParse({ ...base, amount: '' }).success).toBe(false);
  });

  it('refuses the extra zero', () => {
    expect(createClientCreditSchema.safeParse({ ...base, amount: 50_000_000 }).success).toBe(false);
  });

  it('refuses a negative amount — direction is `type`, never a minus sign', () => {
    expect(createClientCreditSchema.safeParse({ ...base, amount: -5000 }).success).toBe(false);
  });

  it('requires a client and a date', () => {
    const { clientId: _client, ...noClient } = base;
    const { occurredAt: _date, ...noDate } = base;
    expect(createClientCreditSchema.safeParse(noClient).success).toBe(false);
    expect(createClientCreditSchema.safeParse(noDate).success).toBe(false);
  });

  it('refuses a display date, which is what a picker used to emit', () => {
    expect(
      createClientCreditSchema.safeParse({ ...base, occurredAt: 'Mar 14, 2026' }).success,
    ).toBe(false);
  });
});

describe('updateClientCreditSchema', () => {
  it('refuses an empty body', () => {
    expect(updateClientCreditSchema.safeParse({}).success).toBe(false);
  });

  it('cannot move money to another client', () => {
    // Not an oversight: an entry filed against the wrong client is withdrawn
    // and re-entered, which leaves the mistake visible on both ledgers.
    const parsed = updateClientCreditSchema.parse({ amount: 12000 });
    expect(parsed).not.toHaveProperty('clientId');
  });

  it('lets a reason be cleared but not blanked', () => {
    expect(updateClientCreditSchema.safeParse({ reason: null }).success).toBe(true);
    expect(updateClientCreditSchema.safeParse({ reason: '   ' }).success).toBe(false);
  });

  it('fills no defaults, so an edit cannot rewrite the direction', () => {
    const parsed = updateClientCreditSchema.parse({ reason: 'Corrected' });
    expect(parsed).not.toHaveProperty('type');
    expect(parsed).not.toHaveProperty('amount');
  });
});

describe('queryClientCreditsSchema', () => {
  it('opens on the newest movement, not the newest row typed in', () => {
    const parsed = queryClientCreditsSchema.parse({ clientId: CLIENT });
    expect(parsed.sortBy).toBe('occurredAt');
    expect(parsed.sortOrder).toBe('desc');
    expect(parsed.archived).toBe(false);
  });

  it('requires a client — there is no unscoped ledger', () => {
    expect(queryClientCreditsSchema.safeParse({}).success).toBe(false);
  });

  it('refuses a column outside the allowlist', () => {
    expect(
      queryClientCreditsSchema.safeParse({ clientId: CLIENT, sortBy: 'reason' }).success,
    ).toBe(false);
  });
});

describe('clientCreditSummarySchema', () => {
  it('refuses a filter it does not honour', () => {
    // A summary narrows nothing. Accepting `?type=CREDIT` and reporting the
    // whole balance would be a wrong answer wearing a filter's clothes.
    expect(
      clientCreditSummarySchema.safeParse({ clientId: CLIENT, type: 'CREDIT' }).success,
    ).toBe(false);
  });
});

describe('every client-credit DTO can describe itself', () => {
  it.each([
    ['createClientCreditSchema', createClientCreditSchema],
    ['updateClientCreditSchema', updateClientCreditSchema],
    ['queryClientCreditsSchema', queryClientCreditsSchema],
    ['clientCreditSummarySchema', clientCreditSummarySchema],
  ])('%s', (_name, schema) => {
    expect(() => z.toJSONSchema(schema as never, { io: 'input' })).not.toThrow();
  });
});
