import { describe, expect, it } from 'vitest';
import { DocumentCategory } from '../../generated/prisma/enums.js';
import { EXPIRY_STATES, ExpiryState, expiryState, expiryWhere, isSensitive } from './documents.rules.js';

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const today = d('2026-09-29');

/** Evaluates `expiryWhere` against one date, the way Postgres would. */
function matches(where: ReturnType<typeof expiryWhere>, value: Date | null): boolean {
  const clause = where.expiresOn;
  if (clause === null) return value === null;
  if (value === null) return false;
  if ('lt' in clause && clause.lt && !(value.getTime() < clause.lt.getTime())) return false;
  if ('gte' in clause && clause.gte && !(value.getTime() >= clause.gte.getTime())) return false;
  return true;
}

describe('expiryState', () => {
  it('reads each window', () => {
    expect(expiryState(null, today)).toBe(ExpiryState.NONE);
    expect(expiryState(d('2026-09-28'), today)).toBe(ExpiryState.EXPIRED);
    expect(expiryState(d('2026-09-29'), today)).toBe(ExpiryState.EXPIRING);
    expect(expiryState(d('2026-12-27'), today)).toBe(ExpiryState.EXPIRING);
    expect(expiryState(d('2026-12-28'), today)).toBe(ExpiryState.VALID);
  });

  it('is still valid on its last day', () => {
    expect(expiryState(today, today)).not.toBe(ExpiryState.EXPIRED);
  });
});

describe('expiryWhere agrees with expiryState', () => {
  const samples = [null, d('2025-01-01'), d('2026-09-28'), d('2026-09-29'), d('2026-12-27'), d('2026-12-28'), d('2030-01-01')];

  for (const state of EXPIRY_STATES) {
    it(`admits exactly the ${state} rows`, () => {
      for (const value of samples) {
        expect(matches(expiryWhere(state, today), value)).toBe(expiryState(value, today) === state);
      }
    });
  }
});

describe('isSensitive', () => {
  it('restricts passports and IDs only', () => {
    expect(isSensitive(DocumentCategory.PASSPORT)).toBe(true);
    expect(isSensitive(DocumentCategory.ID)).toBe(true);
    expect(isSensitive(DocumentCategory.CHARTER_AGREEMENT)).toBe(false);
    expect(isSensitive(DocumentCategory.OTHER)).toBe(false);
  });
});
