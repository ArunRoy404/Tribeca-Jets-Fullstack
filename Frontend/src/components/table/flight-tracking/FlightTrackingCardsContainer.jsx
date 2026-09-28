"use client";

import FlightTrackingCard from "./FlightTrackingCard";

export default function FlightTrackingCardsContainer({ flights, getRowActions, onSelectFlight }) {
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
