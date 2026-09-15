"use client";

import { ArrowRight } from "lucide-react";
import SectionCard from "@/components/common/SectionCard";
import StatusBadge from "@/components/common/StatusBadge";

export default function AgentAssociatedTrips({ trips = [] }) {
  return (
    <SectionCard title="Associated Trips" className="bg-white flex-1 min-w-0">
      <div className="flex flex-col gap-3 w-full">
        {trips.map((trip) => (
          <div
            key={trip.id}
            className="flex items-center justify-between gap-3 p-3 rounded-lg border border-secondary bg-[#f8f9fc]/60 hover:bg-[#f8f9fc] transition-colors"
          >
            <div className="flex flex-col gap-1 min-w-0">
              <span className="font-montserrat font-bold text-[14px] text-foreground truncate">
                {trip.id} · {trip.client}
              </span>
              <div className="flex flex-wrap items-center gap-1.5 font-montserrat text-[12px] text-muted-foreground">
                <span className="font-bold text-purple">{trip.origin}</span>
                <ArrowRight className="size-3 text-muted-foreground" />
                <span className="font-bold text-purple">{trip.destination}</span>
                <span>•</span>
                <span>{trip.dateTime}</span>
              </div>
            </div>

            <div className="shrink-0">
              <StatusBadge status={trip.status} bordered />
            </div>
          </div>
        ))}

        {trips.length === 0 && (
          <div className="p-6 text-center text-muted-foreground font-montserrat text-[13px]">
            No associated trips on record.
          </div>
        )}
      </div>
    </SectionCard>
  );
}

