"use client";

import FlightTrackingCard from "./FlightTrackingCard";
import { useFlightTrackingStore } from "@/store/useFlightTrackingStore";

export default function FlightTrackingCardsContainer({ getRowActions }) {
  const { getFilteredFlights, selectFlight, page } = useFlightTrackingStore();
  const filtered = getFilteredFlights();

  const pageSize = 5;
  const startIndex = (page - 1) * pageSize;
  const paginatedFlights = filtered.slice(startIndex, startIndex + pageSize);

  if (paginatedFlights.length === 0) {
    return (
      <div className="lg:hidden flex flex-col items-center justify-center p-8 text-center bg-white rounded-lg border border-border">
        <p className="font-montserrat font-medium text-[14px] text-muted-foreground">
          No active flights found matching filter options.
        </p>
      </div>
    );
  }

  return (
    <div className="lg:hidden flex flex-col gap-3 w-full">
      {paginatedFlights.map((flight) => (
        <FlightTrackingCard
          key={flight.id}
          flight={flight}
          actions={getRowActions ? getRowActions(flight) : []}
          onClick={() => selectFlight(flight.id)}
        />
      ))}
    </div>
  );
}
