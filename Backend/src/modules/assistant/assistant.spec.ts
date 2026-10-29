import { describe, expect, it } from 'vitest';
import { matchWorkflowGuide, suggestionsForContext } from './assistant.knowledge.js';

describe('assistant knowledge base & context suggestions (#34)', () => {
  it('matches workflow questions for recording client payments and FET quotes', () => {
    const payment = matchWorkflowGuide('How do I record a client payment?');
    expect(payment?.id).toBe('record-payment');
    expect(payment?.items.length).toBeGreaterThan(0);

    const fet = matchWorkflowGuide('How do I create a quote with FET?');
    expect(fet?.id).toBe('create-quote-fet');
  });

  it('returns null for live data queries so the service queries Prisma', () => {
    expect(matchWorkflowGuide('Which quotes are waiting on client approval?')).toBeNull();
    expect(matchWorkflowGuide('What trips are departing soon?')).toBeNull();
  });

  it('tailors starter suggestions to the active CRM screen context', () => {
    const quotePrompts = suggestionsForContext('Quotes');
    expect(quotePrompts[0]).toContain('quotes');

    const tripPrompts = suggestionsForContext('Trips');
    expect(tripPrompts[0]).toContain('trips');
  });
});
