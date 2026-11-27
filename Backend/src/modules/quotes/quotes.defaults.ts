import { BadRequestException } from '@nestjs/common';
import { fetDefaults } from '../../common/money/fet-defaults.js';
import type { SettingsRow } from '../settings/settings.view.js';
import type { CreateQuoteInput } from './dto/quote.dto.js';
import { suggestBasePrice } from './quotes.pricing.js';

type QuoteSettings = Pick<SettingsRow,
  'applyFetByDefault' | 'defaultFetPercent' | 'defaultMarkupPercent' |
  'quoteValidityHours' | 'defaultQuoteTerms'>;

/** Seeds a new quote only. Edits keep the record's own values. */
export function quoteDefaults(input: CreateQuoteInput, settings: QuoteSettings, now: Date) {
  if (input.basePrice === undefined && input.operatorCost === undefined) {
    throw new BadRequestException({
      message: 'The base price is required',
      errors: { basePrice: 'The base price is required' },
    });
  }
  const expiry = new Date(now.getTime() + settings.quoteValidityHours * 3_600_000);
  return {
    ...fetDefaults(input, settings),
    basePrice: input.basePrice ?? suggestBasePrice(input.operatorCost!, settings.defaultMarkupPercent / 100),
    validUntil: input.validUntil ?? new Date(`${expiry.toISOString().slice(0, 10)}T00:00:00.000Z`),
    terms: input.terms === undefined ? settings.defaultQuoteTerms : input.terms,
  };
}
