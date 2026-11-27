import { describe, expect, it } from 'vitest';
// @ts-expect-error The frontend deliberately ships JavaScript, without TS declarations.
import { auditFieldLabel, auditFieldList } from '../../Frontend/src/lib/auditLabels.js';

describe('shared timeline labels', () => {
  it('uses screen labels for known keys and a conjunction for the sentence', () => {
    expect(auditFieldLabel('nextFollowUpAt')).toBe('next follow-up');
    expect(auditFieldList(['phone', 'email'])).toBe('phone and email');
    expect(auditFieldList(['assignedBrokerId', 'originAirportId'])).toBe('assigned broker and departure airport');
  });
  it('humanises unknown keys instead of dropping or mislabelling them', () => {
    expect(auditFieldLabel('customDeskFlag')).toBe('custom desk flag');
    expect(auditFieldLabel('future_API_value')).toBe('future api value');
    expect(auditFieldList(['phone', 'futureField'])).toBe('phone and future field');
  });
});
