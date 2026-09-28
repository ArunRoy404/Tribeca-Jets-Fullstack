import { tripPayment } from '../receivables/receivables.amounts.js';
import type { LegViewRow } from './trips.service.js';

/**
 * What an itinerary knows about a leg's flight. `Itinerary.arrivalTime` and
 * `flightTime` describe the *outbound* leg only — nothing records either for
 * a return or a later leg — so any other leg gets null, never the outbound's
 * figure. A withdrawn itinerary is no source at all.
 */
export function itineraryTimes(
  sequence: number,
  itinerary: { arrivalTime: string | null; flightTime: string | null; deletedAt: Date | null } | null,
): { arrivalTime: string | null; flightTime: string | null } {
  if (!itinerary || itinerary.deletedAt || sequence !== 1) return { arrivalTime: null, flightTime: null };
  return { arrivalTime: itinerary.arrivalTime, flightTime: itinerary.flightTime };
}

/**
 * One leg as a screen reads it — Schedule's calendar event, Flight Tracking's
 * flight. The trip's facts ride along, read on this request; arrival and
 * flight time come only from the itinerary; the payment state only for a
 * role that may read receivables — absent otherwise, never a guess.
 */
export function serialiseLeg(row: LegViewRow, receivables: boolean) {
  const { trip, ...leg } = row;
  const { invoices, _count, itinerary, fetRate, ...facts } = trip;
  return {
    ...leg,
    legCount: _count.legs,
    ...itineraryTimes(leg.sequence, itinerary),
    trip: {
      ...facts,
      fetRate: Number(fetRate),
      operatorConfirmed: facts.operatorConfirmedAt !== null,
      itinerary: itinerary && !itinerary.deletedAt ? { id: itinerary.id, status: itinerary.status } : null,
      clientPayment: receivables ? tripPayment(invoices) : undefined,
    },
  };
}
