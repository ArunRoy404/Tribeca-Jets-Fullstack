"use client";

import CommonCard from "@/components/common/CommonCard";
import SectionHeader from "@/components/common/SectionHeader";
import Reveal from "@/components/common/Reveal";
import EmptyLegCard from "@/components/dashboard/empty-legs/EmptyLegCard";
import { useDashboardStore } from "@/store/useDashboardStore";

export default function EmptyLegsSection({ revealDelay = 0 }) {
  const legs = useDashboardStore((s) => s.emptyLegOpportunities);

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <SectionHeader
          title="Empty Leg Opportunities"
          rightText="View Finance →"
          rightHref="/dashboard/empty-legs"
        />

        <div className="relative flex flex-col gap-2 items-start p-4 w-full">
          {legs?.map((leg) => (
            <EmptyLegCard key={leg?.id || leg?.route + leg?.date} leg={leg} />
          ))}
        </div>
      </CommonCard>
    </Reveal>
  );
}
