import { addDays, getMonthGrid, startOfWeek, toISODate } from "@/lib/date";
import { displayName } from "@/lib/client";
import { personName } from "@/lib/lead";
import { formatTripReference, formatTripStatus, formatTripType } from "@/lib/trip";
import { toTripPayment } from "@/lib/receivable";

/**
 * Display helpers for Schedule (#13), the calendar of trip legs.
 *
 * Every event is one leg from the API, and every fact on it — client,
 * aircraft, operator, broker, status — is the trip's own, read on that
 * request. Nothing here stands in for a missing value: an untimed leg says so,
 * and an arrival time exists only where the trip's itinerary recorded one.
 */

const DASH = "—";

/** The four ways to look at the calendar; the URL carries the id. */
export const SCHEDULE_VIEWS = ["day", "week", "month", "year"];
export const SCHEDULE_VIEW_LABELS = { day: "Today", week: "This Week", month: "This Month", year: "Year" };

/** The API's own ceiling on one list request — and the calendar asks for all of it. */
export const SCHEDULE_PAGE_LIMIT = 100;

/**
 * The days a view shows, as `{ from, to }` on the wire. A month is its whole
 * six-week grid, so the leading and trailing days have their flights too.
 * The year view reads counts, not legs, and has no window.
 */
export function scheduleWindow(view, date) {
  if (view === "week") {
    const start = startOfWeek(date);
    return { from: toISODate(start), to: toISODate(addDays(start, 6)) };
  }
  if (view === "month") {
    const weeks = getMonthGrid(date);
    return { from: toISODate(weeks[0][0]), to: toISODate(weeks[weeks.length - 1][6]) };
  }
  if (view === "year") return null;
  return { from: toISODate(date), to: toISODate(date) };
}

/** "Yes (7.5%)" or "No" — the trip's own FET setting, never recomputed here. */
function formatFet(enabled, rate) {
  if (!enabled) return "No";
  const percent = Number(rate) * 100;
  return Number.isFinite(percent) ? `Yes (${Number(percent.toFixed(3))}%)` : "Yes";
}

function aircraftName(trip) {
  return trip?.aircraft?.model || trip?.aircraftDescription || DASH;
}

/** One calendar event — a leg — as every schedule component reads it. */
export function toScheduleEvent(leg) {
  const trip = leg?.trip;
  const legCount = leg?.legCount ?? 1;
  const payment = trip?.clientPayment === undefined ? null : toTripPayment(trip.clientPayment);
  return {
    id: leg?.id,
    tripId: trip?.id ?? null,
    title: formatTripReference(trip?.reference),
    legLabel: legCount > 1 ? `Leg ${leg?.sequence} of ${legCount}` : null,
    // The leg's own day, exactly as typed — the API stores it as midnight UTC.
    date: leg?.departureDate ? String(leg.departureDate).slice(0, 10) : null,
    time: leg?.departureTime ?? null,
    timeLabel: leg?.departureTime ?? "Time not set",
    arrivalTime: leg?.arrivalTime ?? null,
    duration: leg?.flightTime || DASH,
    rawStatus: trip?.status ?? null,
    status: formatTripStatus(trip?.status),
    client: trip?.client ? displayName(trip.client) : DASH,
    from: leg?.originAirport?.icao ?? leg?.originAirport?.iata ?? DASH,
    to: leg?.destinationAirport?.icao ?? leg?.destinationAirport?.iata ?? DASH,
    aircraft: aircraftName(trip),
    tailNumber: trip?.aircraft?.tailNumber || DASH,
    operator: trip?.operator?.name || DASH,
    broker: trip?.assignedBroker ? personName(trip.assignedBroker) : "Unassigned",
    tripType: formatTripType(trip?.type),
    operatorConfirmed: Boolean(trip?.operatorConfirmed),
    // Null when the caller may not read receivables — the sheet leaves the row out.
    paymentStatus: payment?.known ? payment.state : null,
    fetApplied: formatFet(trip?.fetEnabled, trip?.fetRate),
    itinerary: trip?.itinerary ?? null,
  };
}

/** The tiles, from the API's counts. A dash while they load, never a zero. */
export function toScheduleStats(stats) {
  const value = (n) => (n === undefined || n === null ? DASH : String(n));
  return [
    { label: "Flights Today", value: value(stats?.flightsToday), tone: "foreground" },
    { label: "In Flight", value: value(stats?.inFlight), tone: "destructive" },
    { label: "Next 7 Days", value: value(stats?.nextSevenDays), tone: "info" },
    { label: "Completed Today", value: value(stats?.completedToday), tone: "success" },
  ];
}
