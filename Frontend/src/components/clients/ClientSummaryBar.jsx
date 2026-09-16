function InfoField({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5 sm:gap-1 min-w-0">
      <p className="font-montserrat text-[11px] sm:text-[12px] text-muted-foreground whitespace-nowrap uppercase font-medium">
        {label}
      </p>
      <p className="font-montserrat font-bold text-[13px] sm:text-[14px] text-foreground truncate">
        {value}
      </p>
    </div>
  );
}

/**
 * Top flight context bar matching Figma design.
 * Uses real client values where available, with hardcoded preview values for pending trip integration.
 */
export default function ClientSummaryBar({ client }) {
  // Hardcoded preview values — to be wired to real API endpoint once trips API is integrated with clients
  const flightContext = {
    clientName: "Kevin Monroe",
    tripType: "One Way",
    broker: "Mark",
    operator: "Flexjet",
    aircraft: "Global 7500",
    passengers: "4",
    departure: "JFK - Aug 1, 2026 22:00",
    arrival: "LHR - Aug 1, 2026 00:45",
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-4 p-4 sm:p-5 bg-white border-b border-border w-full">
      <InfoField label="Client" value={flightContext.clientName} />
      <InfoField label="Trip Type" value={flightContext.tripType} />
      <InfoField label="Broker" value={flightContext.broker} />
      <InfoField label="Operator" value={flightContext.operator} />
      <InfoField label="Aircraft" value={flightContext.aircraft} />
      <InfoField label="Passengers" value={flightContext.passengers} />
      <InfoField label="Departure" value={flightContext.departure} />
      <InfoField label="Arrival" value={flightContext.arrival} />
    </div>
  );
}
