import { describe, expect, it } from 'vitest';
import { tallyTrips, tripFigures } from './trips.figures.js';

const trip = (basePrice: number | null, operatorCost: number | null = null, fetEnabled = true) =>
  tripFigures({ basePrice, operatorCost, fetEnabled, fetRate: 0.075, lineItems: [] });

describe('tallyTrips', () => {
  it('sums revenue, FET and profit to the cent', () => {
    const tally = tallyTrips([trip(10_000, 8_000), trip(20_000.1, 15_000)]);
    // 10,000 + 750 FET, and 20,000.10 + 1,500.01 FET (7.5% of 20,000.10, to the cent).
    expect(tally.revenue).toBe(32_250.11);
    expect(tally.fet).toBe(2_250.01);
    expect(tally.tripCount).toBe(2);
    expect(tally.pricedCount).toBe(2);
  });

  it('counts an unpriced trip but adds nothing for it', () => {
    const tally = tallyTrips([trip(10_000, 8_000), trip(null)]);
    expect(tally.tripCount).toBe(2);
    expect(tally.pricedCount).toBe(1);
    expect(tally.revenue).toBe(10_750);
  });

  it('takes profit and margin only over trips whose operator cost is known', () => {
    const known = trip(10_000, 8_000, false);
    const unknown = trip(50_000, null, false);
    const tally = tallyTrips([known, unknown]);
    expect(tally.revenue).toBe(60_000);
    expect(tally.profit).toBe(known!.grossProfit);
    expect(tally.profitTripCount).toBe(1);
    // Over the $10,000 trip alone, not over $60,000.
    expect(tally.marginPercentage).toBe(20);
  });

  it('has no margin to report with nothing to divide', () => {
    expect(tallyTrips([]).marginPercentage).toBeNull();
    expect(tallyTrips([trip(10_000)]).marginPercentage).toBeNull();
  });
});
