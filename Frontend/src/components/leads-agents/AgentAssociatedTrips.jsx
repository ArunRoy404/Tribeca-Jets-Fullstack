"use client";

import DetailCard from "@/components/common/DetailCard";
import StatusBadge from "@/components/common/StatusBadge";
import { Plane } from "lucide-react";
import { useRouter } from "next/navigation";

/**
 * AgentAssociatedTrips
 *
 * API Integration Guidelines:
 * - Data source: `GET /api/trips?brokerId={agentId}&limit=10`
 * - Expected item wire shape:
 *   - id: string (e.g. "TJ-1049")
 *   - client: string (Client full name)
 *   - route: string (e.g. "LAX → ASE")
 *   - departureDate / time: string
 *   - status: TripStatus enum ("IN_PROGRESS", "QUOTED", "CONFIRMED", "COMPLETED")
 *
 * Note: Trips module integration for brokers is awaiting the trips brokerage query service.
 * When trips is empty, renders an honest empty state ("never display a number the data did not supply").
 */
export default function AgentAssociatedTrips({ trips = [] }) {
  const router = useRouter();

  return (
    <DetailCard title="Associated Trips" className="h-full">
      {trips.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-white w-full">
          <div className="size-10 rounded-full bg-secondary/60 flex items-center justify-center text-muted-foreground mb-3">
            <Plane className="size-5" />
          </div>
          <p className="font-montserrat font-bold text-[14px] text-foreground">
            No Associated Trips
          </p>
          <p className="font-montserrat text-[12px] text-muted-foreground mt-1 max-w-xs">
            Trips booked by this broker will appear here once the Trips service is connected.
          </p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border/60">
          {trips.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between py-3 first:pt-0 last:pb-0 hover:bg-muted/10 transition-colors cursor-pointer rounded px-1.5 -mx-1.5"
              onClick={() => router.push(`/dashboard/trips/${item.id}`)}
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-montserrat font-bold text-[13px] text-foreground">
                  {item.id} · {item.client}
                </span>
                <span className="font-montserrat text-[11px] sm:text-[12px] text-muted-foreground">
                  {item.route} · {item.time}
                </span>
              </div>
              <StatusBadge status={item.status} bordered />
            </div>
          ))}
        </div>
      )}
    </DetailCard>
  );
}
