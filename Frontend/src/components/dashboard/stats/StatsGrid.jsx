"use client";

import StatCard from "./StatCard";
import StaggerContainer from "@/components/common/StaggerContainer";
import StaggerItem from "@/components/common/StaggerItem";
import { useDashboardStore } from "@/store/useDashboardStore";

export default function StatsGrid() {
  const statsRow1 = useDashboardStore((s) => s.statsRow1);
  const statsRow2 = useDashboardStore((s) => s.statsRow2);

  return (
    <StaggerContainer stagger={0.06} delay={0.1} className="flex flex-col gap-3 sm:gap-6 w-full px-3 sm:px-4">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-6 items-stretch w-full">
        {statsRow1?.map((card) => (
          <StaggerItem key={card?.id || card?.title + card?.value} className="h-full">
            <StatCard {...card} />
          </StaggerItem>
        ))}
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-6 items-stretch w-full">
        {statsRow2?.map((card) => (
          <StaggerItem key={card?.id || card?.title + card?.badgeText} className="h-full">
            <StatCard {...card} />
          </StaggerItem>
        ))}
      </div>
    </StaggerContainer>
  );
}
