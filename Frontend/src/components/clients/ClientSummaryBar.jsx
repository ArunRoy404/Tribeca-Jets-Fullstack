import { formatTime } from "@/lib/time";
import { formatTripRoute, formatTripType, formatTripStatus, formatLegDeparture } from "@/lib/trip";
import { cn } from "@/lib/utils";

function InfoField({ label, value, className }) {
  return (
    <div className={cn("flex flex-col gap-0.5 sm:gap-1 min-w-0", className)}>
      <p className="font-montserrat text-[11px] sm:text-[12px] text-muted-foreground whitespace-nowrap uppercase font-medium">
        {label}
      </p>
      <p className="font-montserrat font-bold text-[12px] sm:text-[13px] xl:text-[14px] text-foreground break-words">
        {value}
      </p>
    </div>
  );
}

/** The existing flight-context strip, now supplied by the client's scoped latest trip. */
export default function ClientSummaryBar({ client }) {
  const trip = client?.latestTrip;
  if (!trip) return <div className="p-4 sm:p-5 bg-white border-b border-border font-montserrat text-muted-foreground">No trips yet</div>;
  const legs = trip.legs ?? [];
  const first = legs[0];
  const last = legs[legs.length - 1];
  // A leg stores only the operator's arrival estimate ("HH:MM"), never an arrival day.
  const arrival = last?.estimatedArrival ? `ETA ${formatTime(last.estimatedArrival)}` : "—";
  const broker = trip.assignedBroker ? `${trip.assignedBroker.firstName} ${trip.assignedBroker.lastName}` : "Unassigned";
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 xl:flex xl:flex-wrap xl:items-center xl:justify-between gap-4 p-4 sm:p-5 bg-white border-b border-border w-full">
      <InfoField label="Route" value={formatTripRoute(trip)} />
      <InfoField label="Status" value={formatTripStatus(trip.status)} />
      <InfoField label="Client" value={client?.name ?? "—"} />
      <InfoField label="Trip Type" value={formatTripType(trip.type)} />
      <InfoField label="Broker" value={broker} />
      <InfoField label="Operator" value={trip.operator?.name ?? "—"} />
      <InfoField label="Aircraft" value={trip.aircraft ? `${trip.aircraft.tailNumber} · ${trip.aircraft.model}` : trip.aircraftDescription ?? "—"} />
      <InfoField label="Passengers" value={trip.passengerCount ?? "—"} />
      <InfoField label="Departure" value={formatLegDeparture(first)} />
      <InfoField label="Arrival" value={arrival} />
    </div>
  );
}
