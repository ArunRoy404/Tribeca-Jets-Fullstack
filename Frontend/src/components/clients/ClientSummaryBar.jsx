import { cn } from "@/lib/utils";

function InfoField({ label, value, className }) {
  return (
    <div className={cn("flex flex-col gap-0.5 sm:gap-1 min-w-0 shrink-0", className)}>
      <p className="font-montserrat text-[11px] sm:text-[12px] text-muted-foreground whitespace-nowrap uppercase font-medium">
        {label}
      </p>
      <p className="font-montserrat font-bold text-[12px] sm:text-[13px] xl:text-[14px] text-foreground whitespace-nowrap">
        {value}
      </p>
    </div>
  );
}

/**
 * Client Flight Summary Bar
 *
 * API Integration Guidelines:
 * - Client Name and Assigned Broker are wired directly to the active Client entity.
 * - Flight context (Trip Type, Operator, Aircraft, Passengers, Departure, Arrival)
 *   will be supplied by the Trips module (active / latest trip for this client).
 *   When the Trips API ships:
 *   - Fetch client's latest trip: GET /api/trips?clientId={clientId}&status=CONFIRMED,BOOKED&limit=1
 *   - Map fields:
 *       tripType: formatTripType(trip.type)
 *       operator: trip.operator?.name
 *       aircraft: trip.aircraft?.name || trip.aircraftModel
 *       passengers: trip.passengersCount
 *       departure: `${trip.fromCode} - ${formatDateTime(trip.departureTime)}`
 *       arrival: `${trip.toCode} - ${formatDateTime(trip.arrivalTime)}`
 *   Until then, render honest em dashes per project agreement ("never display a number the data did not supply").
 */
export default function ClientSummaryBar({ client }) {
  const clientName = client?.name || "—";
  const broker = client?.broker || "—";

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 xl:flex xl:items-center xl:justify-between gap-4 p-4 sm:p-5 bg-white border-b border-border w-full overflow-x-auto">
      <InfoField label="Client" value={clientName} />
      <InfoField label="Trip Type" value="—" />
      <InfoField label="Broker" value={broker} />
      <InfoField label="Operator" value="—" />
      <InfoField label="Aircraft" value="—" />
      <InfoField label="Passengers" value="—" />
      <InfoField label="Departure" value="—" />
      <InfoField label="Arrival" value="—" />
    </div>
  );
}
