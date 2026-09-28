"use client";

import { useMemo } from "react";
import StatCard from "./StatCard";
import StaggerContainer from "@/components/common/StaggerContainer";
import StaggerItem from "@/components/common/StaggerItem";
import TableStatus from "@/components/table/common/TableStatus";
import { useDashboardParams, useDashboardSummary } from "@/hooks/dashboard";
import { toSummaryTiles } from "@/lib/dashboard";
import { toISODate } from "@/lib/date";

/**
 * The tiles, from `/dashboard/summary` for the period in the URL. Which
 * tiles appear is the API's answer — a section the role may not read never
 * comes back, so it is not drawn.
 */
export default function StatsGrid() {
  const { period } = useDashboardParams();
  const { data, isPending, error, refetch } = useDashboardSummary({ period, on: toISODate(new Date()) });
  const tiles = useMemo(() => toSummaryTiles(data, period), [data, period]);

  if (isPending || error) {
    return (
      <div className="w-full px-3 sm:px-4">
        <TableStatus isLoading={isPending} error={error} onRetry={refetch} />
      </div>
    );
  }

  return (
    <StaggerContainer stagger={0.06} delay={0.1} className="w-full px-3 sm:px-4">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-6 items-stretch w-full">
        {tiles?.map((card) => (
          <StaggerItem key={card?.id} className="h-full">
            <StatCard {...card} />
          </StaggerItem>
        ))}
      </div>
    </StaggerContainer>
  );
}
