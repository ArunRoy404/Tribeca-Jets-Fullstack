import { fromCents, toCents } from '../../common/money/cents.js';
import { priceQuote, type PricedQuote, type PricingInputs } from '../quotes/quotes.pricing.js';

/** A trip's price inputs as stored; `basePrice` is null until it is priced. */
export type TripPricingRow = Omit<PricingInputs, 'basePrice'> & {
  basePrice: PricingInputs['basePrice'] | null;
};

/** A trip's computed figures, or null when it has no price yet. */
export function tripFigures(row: TripPricingRow): PricedQuote | null {
  return row.basePrice === null ? null : priceQuote({ ...row, basePrice: row.basePrice });
}

export interface TripTally {
  /** Every trip counted, priced or not. */
  tripCount: number;
  /** How many of them had a price — revenue is summed over these. */
  pricedCount: number;
  revenue: number;
  /** FET charged on those trips (not FET collected — that is a payment fact). */
  fet: number;
  /** Over the trips whose operator cost is known; `profitTripCount` says how many. */
  profit: number;
  profitTripCount: number;
  /** Profit over the revenue of the same trips, to one decimal; null with nothing to divide. */
  marginPercentage: number | null;
}

/**
 * Sums a set of trips' figures in cents — the one copy of this arithmetic,
 * used by the dashboard's tiles and by every Reports figure, so the two can
 * never disagree about the same trips.
 *
 * Each figure is the trip's own computed one (`priceQuote`), never re-derived.
 * A trip with no price is counted but adds nothing; profit and margin cover
 * only trips whose operator cost is known, because a profit total silently
 * missing half the trips reads as a bad month.
 */
export function tallyTrips(figures: (PricedQuote | null)[]): TripTally {
  let priced = 0;
  let revenue = 0;
  let fet = 0;
  let profit = 0;
  let profitRevenue = 0;
  let profitKnown = 0;

  for (const trip of figures) {
    if (!trip) continue;
    priced += 1;
    revenue += toCents(trip.totalPrice);
    fet += toCents(trip.fetAmount);
    if (trip.grossProfit !== null) {
      profit += toCents(trip.grossProfit);
      profitRevenue += toCents(trip.totalPrice);
      profitKnown += 1;
    }
  }

  return {
    tripCount: figures.length,
    pricedCount: priced,
    revenue: fromCents(revenue),
    fet: fromCents(fet),
    profit: fromCents(profit),
    profitTripCount: profitKnown,
    marginPercentage: profitRevenue > 0 ? Math.round((profit / profitRevenue) * 1000) / 10 : null,
  };
}
