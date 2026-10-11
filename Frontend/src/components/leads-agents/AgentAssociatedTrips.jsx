"use client";

import { Loader2, Plane } from "lucide-react";
import { useRouter } from "next/navigation";
import DetailCard from "@/components/common/DetailCard";
import StatusBadge from "@/components/common/StatusBadge";
import { useTrips } from "@/hooks/trips";
import { toTripRow } from "@/lib/trip";

/**
 * AgentAssociatedTrips
 *
 * Displays trips booked by this broker/agent.
 * Queries `GET /trips?assignedBrokerId={agentId}&limit=10`.
 */
export default function AgentAssociatedTrips({ agentId, trips }) {
  const router = useRouter();

  const { data, isPending } = useTrips(
    { assignedBrokerId: agentId, limit: 10, sortBy: "departureDate", sortOrder: "desc" },
    { enabled: Boolean(agentId) && !trips }
  );

  const rows = trips ?? (data?.data ?? []).map(toTripRow);

  return (
    <DetailCard title="Associated Trips" className="h-full">
      {isPending && !trips ? (
        <div className="flex items-center justify-center p-8 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-white w-full">
          <div className="size-10 rounded-full bg-secondary/60 flex items-center justify-center text-muted-foreground mb-3">
            <Plane className="size-5" />
          </div>
          <p className="font-montserrat font-bold text-[14px] text-foreground">
            No Associated Trips
          </p>
          <p className="font-montserrat text-[12px] text-muted-foreground mt-1 max-w-xs">
            No trips on record booked by this broker yet.
          </p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border/60">
          {rows.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between py-3 first:pt-0 last:pb-0 hover:bg-muted/10 transition-colors cursor-pointer rounded px-1.5 -mx-1.5"
              onClick={() => router.push(`/dashboard/trips/${item.id}`)}
            >
              <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                <span className="font-montserrat font-bold text-[13px] text-foreground truncate">
                  {item.reference || item.id} · {item.client}
                </span>
                <span className="font-montserrat text-[11px] sm:text-[12px] text-muted-foreground truncate">
                  {item.route} {item.departure && item.departure !== "—" ? `· ${item.departure}` : ""}
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
