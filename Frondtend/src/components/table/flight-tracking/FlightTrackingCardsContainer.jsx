"use client";

import FlightTrackingCard from "./FlightTrackingCard";

export default function FlightTrackingCardsContainer({ flights, getRowActions, onSelectFlight }) {
  if (!flights || flights.length === 0) {
    return (
      <div className="lg:hidden flex flex-col items-center justify-center p-8 text-center bg-white rounded-lg border border-border">
        <p className="font-montserrat font-medium text-[14px] text-muted-foreground">
          No active flights found matching filter options.
        </p>
      </div>
    );
  }

  return (
    <div className="lg:hidden flex flex-col gap-3 w-full p-3">
      {flights.map((flight) => (
        <FlightTrackingCard
          key={flight?.id}
          flight={flight}
          actions={getRowActions ? getRowActions(flight) : []}
          onClick={() => onSelectFlight?.(flight?.id)}
        />
      ))}
    </div>
  );
}
