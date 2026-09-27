import { describe, expect, it } from 'vitest';
import { estimateLeg, greatCircleNm } from './charter-rates.estimate.js';

const KTEB = { latitude: 40.850101, longitude: -74.060799 };
const KPBI = { latitude: 26.683201, longitude: -80.095596 };
const EGLL = { latitude: 51.4706, longitude: -0.461941 };

describe('greatCircleNm', () => {
  it('measures Teterboro to Palm Beach as the published ~902 nm (1,038 statute miles)', () => {
    const distance = greatCircleNm(KTEB, KPBI);
    expect(distance).toBeGreaterThan(895);
    expect(distance).toBeLessThan(910);
  });

  it('measures a transatlantic leg', () => {
    const distance = greatCircleNm(KTEB, EGLL);
    expect(distance).toBeGreaterThan(2980);
    expect(distance).toBeLessThan(3010);
  });

  it('is zero for the same airport and symmetric either way', () => {
    expect(greatCircleNm(KTEB, KTEB)).toBe(0);
    expect(greatCircleNm(KTEB, KPBI)).toBe(greatCircleNm(KPBI, KTEB));
  });
});

describe('estimateLeg', () => {
  const rate = { hourlyRate: 4500, averageSpeedKnots: 420, minimumHours: null };

  it('turns distance into flight time and cost', () => {
    // 890 / 420 = 2.119… → 2.1 h × $4,500
    expect(estimateLeg(890, rate)).toEqual({ flightHours: 2.1, billedHours: 2.1, cost: 9450 });
  });

  it('bills the minimum on a short hop', () => {
    const est = estimateLeg(100, { ...rate, minimumHours: 1.5 });
    expect(est?.flightHours).toBe(0.2);
    expect(est?.billedHours).toBe(1.5);
    expect(est?.cost).toBe(6750);
  });

  /** No rate is never a $0 rate. */
  it('returns null, not zero, when the rate table has no figure', () => {
    expect(estimateLeg(890, { ...rate, hourlyRate: null })).toBeNull();
    expect(estimateLeg(890, { ...rate, averageSpeedKnots: null })).toBeNull();
    expect(estimateLeg(890, { ...rate, averageSpeedKnots: 0 })).toBeNull();
  });
});
