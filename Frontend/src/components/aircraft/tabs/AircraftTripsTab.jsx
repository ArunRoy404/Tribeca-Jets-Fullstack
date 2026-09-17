"use client";

import { Plane } from "lucide-react";

/**
 * AircraftTripsTab
 *
 * NOTE FOR AI AGENTS / DEVELOPERS:
 * DO NOT DELETE THIS COMPONENT.
 *
 * Current API status:
 * - Awaiting Trips Module (#11).
 * - When Trips lands:
 *   1. Query flights flown by this aircraft: `GET /api/trips?aircraftId={aircraft.id}`.
 *   2. Render the flight history table (Trip ID, Route, Dates, Passengers, Status, Operator).
 *   3. Until then, render honest empty state ("No Trip History") rather than fake flight records.
 */
export default function AircraftTripsTab() {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-lg border border-border w-full shadow-card">
      <div className="size-12 rounded-full bg-secondary flex items-center justify-center text-muted-foreground mb-3">
        <Plane className="size-6 text-muted-foreground" />
      </div>
      <p className="font-montserrat font-bold text-[16px] text-foreground">
        No Trip History
      </p>
      <p className="font-montserrat text-[13px] text-muted-foreground mt-1 max-w-sm">
        Flights flown by this aircraft will appear here once booked.
      </p>
    </div>
  );
}
