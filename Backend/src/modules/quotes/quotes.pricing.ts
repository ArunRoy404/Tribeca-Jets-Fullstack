import type { Prisma } from '../../generated/prisma/client.js';

/**
 * One extra on an offer, as stored in `Quote.lineItems`.
 *
 * `included: true` with no amount is the "Included" a quote prints — a line
 * the client sees with no money against it.
 */
export type QuoteLineItem = {
  label: string;
  amount: number | null;
  included: boolean;
};

export type PricingInputs = {
  basePrice: Prisma.Decimal | number;
  fetEnabled: boolean;
  fetRate: Prisma.Decimal | number;
  operatorCost: Prisma.Decimal | number | null;
  lineItems: unknown;
};

export type PricedQuote = {
  basePrice: number;
  fetRate: number;
  fetAmount: number;
  extrasTotal: number;
  totalPrice: number;
  operatorCost: number | null;
  grossProfit: number | null;
  marginPercentage: number | null;
  lineItems: QuoteLineItem[];
};

/** Money to the cent. `Math.round` alone leaves 0.1 + 0.2 showing up. */
const cents = (value: number) => Math.round(value * 100) / 100;

const toNumber = (value: Prisma.Decimal | number | null): number | null =>
  value === null ? null : Number(value);

/**
 * `Quote.lineItems` is JSON, so it is untrusted at the boundary even though
 * the DTO validated it on the way in — a column read back can hold whatever a
 * past migration or a direct write put there. Anything that is not a usable
 * line is dropped rather than allowed to poison a total.
 */
export function readLineItems(raw: unknown): QuoteLineItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const item = entry as Record<string, unknown>;
    const label = typeof item.label === 'string' ? item.label : null;
    if (!label) return [];
    const amount =
      typeof item.amount === 'number' && Number.isFinite(item.amount)
        ? item.amount
        : null;
    return [{ label, amount, included: item.included === true }];
  });
}

/**
 * Every figure on a quote that is not typed by a person.
 *
 * **Nothing here is stored on the quote.** The columns hold only what someone
 * entered — base price, whether tax applies and at what rate, what the
 * operator charges, the extras — and this runs on every read. A stored total
 * beside its own parts is the classic accounting bug: the day an edit moves
 * the base price and the total does not follow, the quote contradicts itself
 * and nothing on screen says which half is right.
 *
 * The one place frozen figures *are* needed — "what exactly did the client see
 * on the 9th?" — is `QuoteVersion`, which snapshots this whole result each time
 * the money moves.
 *
 * **FET is charged on the base charter price only.** US Federal Excise Tax
 * applies to amounts paid for taxable air transportation, which is the charter
 * itself; catering and ground transportation are not that. Charging it across
 * the extras too would overstate the tax on every quote with catering on it,
 * and the client pays that difference.
 */
export function priceQuote(row: PricingInputs): PricedQuote {
  const basePrice = Number(row.basePrice);
  const fetRate = Number(row.fetRate);
  const operatorCost = toNumber(row.operatorCost);
  const lineItems = readLineItems(row.lineItems);

  const fetAmount = row.fetEnabled ? cents(basePrice * fetRate) : 0;
  const extrasTotal = cents(
    lineItems.reduce((sum, item) => sum + (item.amount ?? 0), 0),
  );
  const totalPrice = cents(basePrice + fetAmount + extrasTotal);

  /**
   * Null, not zero, when the operator's price is not in yet. A margin of "we
   * do not know" must never render as 100% profit — that is a number a broker
   * would quote against.
   */
  const grossProfit =
    operatorCost === null ? null : cents(totalPrice - operatorCost);

  const marginPercentage =
    grossProfit === null || totalPrice === 0
      ? null
      : Math.round((grossProfit / totalPrice) * 1000) / 10;

  return {
    basePrice,
    fetRate,
    fetAmount,
    extrasTotal,
    totalPrice,
    operatorCost,
    grossProfit,
    marginPercentage,
    lineItems,
  };
}

/** The fields whose change means the offer is a new version of itself. */
export const PRICED_FIELDS = [
  'basePrice',
  'fetEnabled',
  'fetRate',
  'operatorCost',
  'lineItems',
] as const;
