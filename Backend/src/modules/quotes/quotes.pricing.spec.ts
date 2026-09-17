import { describe, expect, it } from 'vitest';
import { priceQuote, readLineItems } from './quotes.pricing.js';

const base = {
  basePrice: 79500,
  fetEnabled: true,
  fetRate: 0.075,
  operatorCost: 65000,
  lineItems: [],
};

describe('priceQuote', () => {
  it('adds FET to the base charter price', () => {
    const priced = priceQuote(base);
    expect(priced.fetAmount).toBe(5962.5);
    expect(priced.totalPrice).toBe(85462.5);
  });

  it('charges no FET when the leg is exempt', () => {
    const priced = priceQuote({ ...base, fetEnabled: false });
    expect(priced.fetAmount).toBe(0);
    expect(priced.totalPrice).toBe(79500);
  });

  /**
   * The rule that keeps the tax honest: FET is charged on taxable air
   * transportation, which is the charter — not on the catering.
   */
  it('does not charge FET on the extras', () => {
    const priced = priceQuote({
      ...base,
      lineItems: [{ label: 'Ground transport', amount: 850, included: false }],
    });
    expect(priced.fetAmount).toBe(5962.5);
    expect(priced.extrasTotal).toBe(850);
    expect(priced.totalPrice).toBe(86312.5);
  });

  it('counts an included line as words, not money', () => {
    const priced = priceQuote({
      ...base,
      lineItems: [{ label: 'Catering', amount: null, included: true }],
    });
    expect(priced.extrasTotal).toBe(0);
    expect(priced.lineItems).toHaveLength(1);
  });

  /**
   * The one that matters most. A margin nobody has priced must read as
   * unknown, never as every penny being profit.
   */
  it('reports an unpriced margin as null, not as 100%', () => {
    const priced = priceQuote({ ...base, operatorCost: null });
    expect(priced.grossProfit).toBeNull();
    expect(priced.marginPercentage).toBeNull();
  });

  it('works out gross profit and margin from the full total', () => {
    const priced = priceQuote(base);
    expect(priced.grossProfit).toBe(20462.5);
    expect(priced.marginPercentage).toBe(23.9);
  });

  it('holds cents exactly rather than drifting in binary floating point', () => {
    const priced = priceQuote({
      ...base,
      basePrice: 0.1,
      fetEnabled: false,
      operatorCost: null,
      lineItems: [
        { label: 'a', amount: 0.2, included: false },
        { label: 'b', amount: 0.1, included: false },
      ],
    });
    expect(priced.extrasTotal).toBe(0.3);
    expect(priced.totalPrice).toBe(0.4);
  });

  it('treats a zero total as having no margin rather than dividing by zero', () => {
    const priced = priceQuote({
      ...base,
      basePrice: 0,
      fetEnabled: false,
      operatorCost: 0,
    });
    expect(priced.totalPrice).toBe(0);
    expect(priced.marginPercentage).toBeNull();
  });
});

describe('readLineItems', () => {
  it('drops anything that is not a usable line', () => {
    expect(
      readLineItems([
        { label: 'Real', amount: 100, included: false },
        { amount: 50 },
        null,
        'nonsense',
        { label: 'Words', amount: 'lots', included: true },
      ]),
    ).toEqual([
      { label: 'Real', amount: 100, included: false },
      { label: 'Words', amount: null, included: true },
    ]);
  });

  it('survives a column that is not an array at all', () => {
    expect(readLineItems(null)).toEqual([]);
    expect(readLineItems({ label: 'x' })).toEqual([]);
  });
});
