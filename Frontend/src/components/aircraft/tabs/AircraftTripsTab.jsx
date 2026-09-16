"use client";

import { Plane } from "lucide-react";

/**
 * Awaiting its module.
 *
 * This tab rendered a hardcoded table of trips — broker names, routes,
 * operators and statuses — until the Aircraft module was wired to the API. It
 * looked exactly like real flight history for an airframe that had flown
 * nothing. The server returns an empty `tripHistory` deliberately, so the tab
 * says what is true rather than filling the space.
 */
export default function AircraftTripsTab() {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-md border border-border w-full">
      <Plane className="size-10 text-muted-foreground/50 mb-3" />
      <p className="font-montserrat font-bold text-[16px] text-foreground">No Trip History</p>
      <p className="font-montserrat text-[13px] text-muted-foreground mt-1">
        Flights flown by this aircraft will appear here.
      </p>
    </div>
  );
}
