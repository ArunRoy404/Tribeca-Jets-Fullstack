"use client";

import DetailCard from "@/components/common/DetailCard";
import StatusBadge from "@/components/common/StatusBadge";
import { useRouter } from "next/navigation";

const FIGMA_TRIPS = [
  {
    id: "TJ-1049",
    client: "Michael Anderson",
    route: "LAX → ASE",
    time: "Aug 11, 2026 · 14:15",
    status: "In Progress",
  },
  {
    id: "TJ-1047",
    client: "Robert Walsh",
    route: "TEB → PBI",
    time: "Aug 16, 2026 · 08:00",
    status: "Quoted",
  },
  {
    id: "TJ-1052",
    client: "James Kellner",
    route: "TEB → LAS",
    time: "Aug 20, 2026 · 10:00",
    status: "Quoted",
  },
  {
    id: "TJ-1053",
    client: "Elena Voss",
    route: "MIA → NAS",
    time: "Aug 22, 2026 · 09:00",
    status: "Draft",
  },
  {
    id: "TJ-1045",
    client: "Mike Anderson",
    route: "LAX → ASE",
    time: "Aug 11, 2026 · 14:15",
    status: "Confirmed",
  },
];

export default function AgentAssociatedTrips({ trips = [] }) {
  const router = useRouter();
  const displayTrips = trips && trips.length > 0 ? trips : FIGMA_TRIPS;

  return (
    <DetailCard title="Associated Trips" className="h-full">
      <div className="flex flex-col divide-y divide-border/60">
        {displayTrips.map((item) => (
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
    </DetailCard>
  );
}
