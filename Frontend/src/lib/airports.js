export const SAME_AIRPORT_MESSAGE = "Departure and arrival can't be the same airport";

/** Works with picker ids and the client form's typed ICAO codes. */
export function sameAirport(origin, destination) {
  const from = String(origin ?? "").trim().toUpperCase();
  const to = String(destination ?? "").trim().toUpperCase();
  return Boolean(from && to && from === to);
}
