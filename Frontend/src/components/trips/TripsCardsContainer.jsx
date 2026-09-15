import TripCard from "@/components/table/upcoming-trips/TripCard";

export default function TripsCardsContainer({ trips, onSelectTrip, getRowActions }) {
  return (
    <div className="flex flex-col gap-3 p-4 w-full">
      {trips.map((t) => (
        <TripCard
          key={t.id}
          id={t.id}
          client={t.client}
          broker={t.broker}
          route={`${t.from} → ${t.to}`}
          departure={t.departure}
          returnDate={t.return}
          aircraft={t.aircraft}
          operator={t.operator}
          status={t.status}
          clientPmt={t.clientPmt}
          opPmt={t.opPmt}
          fet={t.fet}
          profit={t.profit}
          nextAction={t.nextAction}
          actions={getRowActions(t)}
          onClick={() => onSelectTrip(t)}
        />
      ))}
      {trips.length === 0 && (
        <p className="p-6 text-center font-montserrat text-[12px] text-muted-foreground w-full">
          No trips match the current filters.
        </p>
      )}
    </div>
  );
}
