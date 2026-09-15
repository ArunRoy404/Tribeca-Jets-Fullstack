function InfoField({ label, value }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <p className="font-montserrat text-[12px] text-muted-foreground whitespace-nowrap">{label}</p>
      <p className="font-montserrat font-bold text-[14px] text-foreground truncate">{value}</p>
    </div>
  );
}

export default function TripSummaryBar({ trip }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-4 p-4 sm:p-5 bg-white border-b border-border">
      <InfoField label="Client" value={trip?.client} />
      <InfoField label="Trip Type" value={trip?.tripType} />
      <InfoField label="Broker" value={trip?.broker} />
      <InfoField label="Operator" value={trip?.operator} />
      <InfoField label="Aircraft" value={trip?.aircraft} />
      <InfoField label="Passengers" value={trip?.passengers} />
      <InfoField label="Departure" value={trip?.departureTime} />
      <InfoField label="Arrival" value={trip?.arrivalTime} />
    </div>
  );
}
