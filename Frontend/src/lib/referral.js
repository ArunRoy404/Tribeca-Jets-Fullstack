import { formatTimestamp, toArchiveFields } from "@/lib/archive";
import { formatCalendarDate } from "@/lib/date";
import { formatMoney } from "@/lib/money";
import { formatAircraftCategory } from "@/lib/aircraft";
import { displayName } from "@/lib/client";
import { personName } from "@/lib/lead";

/**
 * Display helpers for portal referrals (#11), on both sides of the portal.
 *
 * The desk and the agent read the same endpoint; the API sends the agent a
 * narrower record (no broker, no CRM client, no archive trail). Every field
 * the agent's record lacks simply maps to a dash here — nothing is inferred.
 */

const DASH = "—";

/** The ladder, in order — the portal draws it as progress. */
export const REFERRAL_LADDER = ["SUBMITTED", "CONTACTED", "QUOTING", "BOOKED", "COMPLETED"];
export const REFERRAL_STATUSES = [...REFERRAL_LADDER, "LOST", "CANCELLED"];

const STATUS_LABELS = {
  SUBMITTED: "Submitted",
  CONTACTED: "Contacted",
  QUOTING: "Quoting",
  BOOKED: "Booked",
  COMPLETED: "Completed",
  LOST: "Lost",
  CANCELLED: "Cancelled",
};

export function formatReferralStatus(status) {
  if (!status) return DASH;
  return STATUS_LABELS[status] ?? status;
}

const code = (airport) => airport?.icao ?? airport?.iata ?? null;

/** "KMIA → KTEB", or a dash when neither end was given. */
export function formatReferralRoute(referral) {
  const from = code(referral?.originAirport);
  const to = code(referral?.destinationAirport);
  if (!from && !to) return DASH;
  return `${from ?? "?"} → ${to ?? "?"}`;
}

export function toReferralRow(referral) {
  const departure = formatCalendarDate(referral?.departureDate);
  return {
    id: referral?.id,
    reference: referral?.reference ? `RF-${referral.reference}` : DASH,
    clientName: `${referral?.clientFirstName ?? ""} ${referral?.clientLastName ?? ""}`.trim() || DASH,
    clientEmail: referral?.clientEmail ?? null,
    clientPhone: referral?.clientPhone ?? null,
    route: formatReferralRoute(referral),
    originName: referral?.originAirport?.name ?? null,
    destinationName: referral?.destinationAirport?.name ?? null,
    departure: referral?.departureTime && departure !== DASH ? `${departure} · ${referral.departureTime}` : departure,
    returnDate: formatCalendarDate(referral?.returnDate),
    passengers: referral?.passengers ?? DASH,
    aircraftPreference: referral?.aircraftPreference ? formatAircraftCategory(referral.aircraftPreference) : DASH,
    budget: formatMoney(referral?.budget),
    notes: referral?.notes ?? null,
    attachmentUrls: referral?.attachmentUrls ?? [],
    status: formatReferralStatus(referral?.status),
    rawStatus: referral?.status ?? null,
    submittedAt: formatTimestamp(referral?.createdAt),
    agent: referral?.agent ? personName(referral.agent) : DASH,
    agentId: referral?.agentId ?? null,
    broker: referral?.assignedBroker ? personName(referral.assignedBroker) : "Unassigned",
    assignedBrokerId: referral?.assignedBrokerId ?? null,
    client: referral?.client ? { id: referral.client.id, name: displayName(referral.client) } : null,
    tripRequest: referral?.tripRequest
      ? { id: referral.tripRequest.id, reference: `TR-${referral.tripRequest.reference}` }
      : null,
    trip: referral?.trip
      ? {
          id: referral.trip.id ?? null,
          reference: `TJ-${referral.trip.reference}`,
          date: formatCalendarDate(referral.trip.departureDate),
        }
      : null,
    tripId: referral?.tripId ?? null,
    converted: Boolean(referral?.tripRequestId || referral?.tripRequest),
    raw: referral,
    ...toArchiveFields(referral),
  };
}
