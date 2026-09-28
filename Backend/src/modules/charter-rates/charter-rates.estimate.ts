/**
 * The arithmetic behind client adjustment #6's instant estimate, as pure
 * functions with tests.
 *
 * An estimate is distance → flight time → billed hours → cost, and every
 * input but the distance is a number the desk typed into its rate table. The
 * distance is the only figure computed from scratch, from the two airports'
 * coordinates, and it is the great-circle distance — the shortest path over
 * the globe, which is what flight planning starts from. Winds, routing and
 * positioning legs are not modelled; the estimate says so on screen rather
 * than pretending to a precision it does not have.
 */

/** Mean Earth radius in nautical miles. */
const EARTH_RADIUS_NM = 3440.065;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Great-circle distance between two coordinates, in nautical miles, to one decimal. */
export function greatCircleNm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(dLon / 2) ** 2;
  const distance = 2 * EARTH_RADIUS_NM * Math.asin(Math.min(1, Math.sqrt(a)));
  return Math.round(distance * 10) / 10;
}

/** The rate fields an estimate needs. Any of them may be missing. */
export type RateInputs = {
  hourlyRate: number | null;
  averageSpeedKnots: number | null;
  minimumHours: number | null;
};

export type LegEstimate = {
  /** Hours in the air at the category's average speed, to one decimal. */
  flightHours: number;
  /** What the operator bills: the flight time, or the minimum if higher. */
  billedHours: number;
  /** Billed hours × hourly rate, to the cent. */
  cost: number;
};

/**
 * One leg's estimate, or `null` when the rate table cannot support one.
 *
 * Null rather than zero, deliberately: a category with no hourly rate on file
 * has no estimate, and "$0" would be a number somebody reads down the phone.
 */
export function estimateLeg(distanceNm: number, rate: RateInputs): LegEstimate | null {
  if (rate.hourlyRate === null || rate.averageSpeedKnots === null) return null;
  if (rate.averageSpeedKnots <= 0) return null;

  const flightHours = Math.round((distanceNm / rate.averageSpeedKnots) * 10) / 10;
  const billedHours = Math.max(flightHours, rate.minimumHours ?? 0);
  const cost = Math.round(billedHours * rate.hourlyRate * 100) / 100;
  return { flightHours, billedHours, cost };
}
