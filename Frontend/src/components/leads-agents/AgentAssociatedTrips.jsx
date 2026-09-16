"use client";

import { Plane } from "lucide-react";

/**
 * Awaiting its module.
 *
 * This rendered a hardcoded list of trips until Leads & Agents was wired to
 * the API. Nothing on the server can supply a broker's trips yet, so it says
 * so rather than showing flights that were never real.
 */
export default function AgentAssociatedTrips() {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-md border border-border w-full">
      <Plane className="size-10 text-muted-foreground/50 mb-3" />
      <p className="font-montserrat font-bold text-[16px] text-foreground">No Trips Yet</p>
      <p className="font-montserrat text-[13px] text-muted-foreground mt-1">
        Trips booked by this broker will appear here.
      </p>
    </div>
  );
}
