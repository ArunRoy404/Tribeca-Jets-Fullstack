"use client";

import { cn } from "@/lib/utils";
import SimpleStatCard from "@/components/common/SimpleStatCard";
import StaggerContainer from "@/components/common/StaggerContainer";
import StaggerItem from "@/components/common/StaggerItem";

/**
 * A row of small stat tiles. `gridClassName` is optional and replaces the
 * default six-across grid when a row holds a different number of tiles (the
 * partner portal's four referral and three commission figures); without it
 * the row lays out exactly as before.
 */
export default function SimpleStatsRow({ stats, className, gridClassName }) {
  return (
    <div className={cn("w-full", className)}>
      <StaggerContainer
        stagger={0.06}
        delay={0.1}
        className={cn(gridClassName ?? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6", "gap-3 sm:gap-4 items-stretch w-full")}
      >
        {stats?.map((stat) => (
          <StaggerItem key={stat?.label} className="flex-1 min-w-0 h-full">
            <SimpleStatCard
              label={stat?.label}
              value={stat?.value}
              tone={stat?.tone}
            />
          </StaggerItem>
        ))}
      </StaggerContainer>
    </div>
  );
}
