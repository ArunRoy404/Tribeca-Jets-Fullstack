import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { createQuoteSchema, updateQuoteSchema } from './dto/quote.dto.js';
import { quoteDefaults } from './quotes.defaults.js';

const settings = {
  applyFetByDefault: false, defaultFetPercent: 8.25, defaultMarkupPercent: 18,
  quoteValidityHours: 12, defaultQuoteTerms: 'Desk terms',
};
const now = new Date('2026-11-27T18:30:00Z');
const clientId = '11111111-1111-4111-8111-111111111111';

describe('quote create defaults', () => {
  it('takes every absent field from Settings and truncates expiry to its UTC calendar day', () => {
    const input = createQuoteSchema.parse({ clientId, operatorCost: 1000 });
    expect(input.fetEnabled).toBeUndefined();
    expect(quoteDefaults(input, settings, now)).toEqual({
      basePrice: 1180, fetEnabled: false, fetRate: 0.0825,
      validUntil: new Date('2026-11-28T00:00:00Z'), terms: 'Desk terms',
    });
  });

  it('keeps all sent values, including zero base, zero rate and empty terms', () => {
    const input = createQuoteSchema.parse({ clientId, basePrice: 0, operatorCost: 1000,
      fetEnabled: false, fetRate: 0, validUntil: '2026-12-10', terms: '' });
    expect(quoteDefaults(input, { ...settings, applyFetByDefault: true }, now)).toEqual({
      basePrice: 0, fetEnabled: false, fetRate: 0, validUntil: new Date('2026-12-10T00:00:00Z'), terms: '',
    });
  });

  it('keeps explicit true and terms, and null company terms stay null', () => {
    const input = { clientId, basePrice: 10, fetEnabled: true, terms: 'Bespoke terms' };
    expect(quoteDefaults(input, settings, now)).toMatchObject({ fetEnabled: true, terms: 'Bespoke terms' });
    expect(quoteDefaults({ clientId, basePrice: 10 }, { ...settings, defaultQuoteTerms: null }, now).terms).toBeNull();
  });

  it('refuses neither base nor cost with the existing 400 field message', () => {
    try {
      quoteDefaults(createQuoteSchema.parse({ clientId }), settings, now);
      expect.fail('Expected a missing-price refusal');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toEqual({
        message: 'The base price is required', errors: { basePrice: 'The base price is required' },
      });
    }
  });

  it('leaves updates free of all create defaults', () => {
    expect(updateQuoteSchema.parse({ internalNotes: 'Call tomorrow' })).toEqual({ internalNotes: 'Call tomorrow' });
  });
});
