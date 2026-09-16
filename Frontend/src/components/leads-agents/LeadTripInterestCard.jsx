"use client";

/**
 * LeadTripInterestCard
 *
 * API Integration Guidelines:
 * - Data source: `request` row mapped via `toTripRequestRow` from `GET /api/trip-requests?clientId={id}`
 * - Fields:
 *   - Route: request.route (e.g. "KTEB → KMIA") or lead.route
 *   - Departure: request.departureDate
 *   - Return: request.returnDate (if round trip) or "One-way"
 *   - Passengers: request.passengers
 *   - Aircraft: request.aircraftPreference
 *   - Notes: request.summary or request.requirements
 *
 * When no enquiry has been filed, renders an honest empty state.
 */
export default function LeadTripInterestCard({ lead, request }) {
  const hasRequest = Boolean(request || (lead?.route && lead.route !== "—"));

  const route =
    request?.route && request.route !== "—"
      ? request.route
      : lead?.route && lead.route !== "—"
      ? lead.route
      : "—";
  const departure =
    request?.departureDate && request.departureDate !== "—"
      ? request.departureDate
      : "—";
  const returnDate = request?.isRoundTrip
    ? request.returnDate
    : request
    ? "One-way"
    : "—";
  const passengers =
    request?.passengers && request.passengers !== "—"
      ? `${request.passengers} pax`
      : "—";
  const aircraft = request?.aircraftPreference || "—";
  const notes =
    request?.summary ||
    request?.requirements ||
    "No specific preferences on file.";

  return (
    <div className="rounded-lg border border-border p-3.5 sm:p-4 bg-white flex flex-col gap-2.5 shadow-sm">
      <h4 className="font-montserrat font-bold text-[13px] text-foreground">
        Trip Interest
      </h4>
      {!hasRequest ? (
        <p className="font-montserrat text-[12px] text-muted-foreground py-2">
          No trip requests or flight requirements recorded for this lead yet.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-border/50 text-[11px] sm:text-[12px] font-montserrat">
          <div className="flex items-center justify-between py-2 first:pt-0">
            <span className="text-muted-foreground">Route</span>
            <span className="font-bold text-foreground">{route}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-muted-foreground">Departure</span>
            <span className="font-bold text-foreground">{departure}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-muted-foreground">Return</span>
            <span className="font-bold text-foreground">{returnDate}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-muted-foreground">Passengers</span>
            <span className="font-bold text-foreground">{passengers}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-muted-foreground">Aircraft</span>
            <span className="font-bold text-foreground">{aircraft}</span>
          </div>
          <div className="flex flex-col gap-1 py-2 last:pb-0">
            <span className="text-muted-foreground">Notes</span>
            <span className="font-medium text-foreground">{notes}</span>
          </div>
        </div>
      )}
    </div>
  );
}
