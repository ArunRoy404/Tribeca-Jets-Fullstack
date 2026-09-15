"use client";

import CommonCard from "@/components/common/CommonCard";
import SectionHeader from "@/components/common/SectionHeader";
import Reveal from "@/components/common/Reveal";
import FollowUpItem from "@/components/dashboard/follow-ups/FollowUpItem";
import { useDashboardStore } from "@/store/useDashboardStore";

export default function FollowUpsSection({ revealDelay = 0 }) {
  const followUps = useDashboardStore((s) => s.upcomingFollowUps);

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <SectionHeader
          title="Upcoming Follow-ups"
          rightText="View all Follow-ups →"
          rightHref="/dashboard/leads-agents"
        />

        <div className="relative flex flex-col items-start w-full">
          {followUps?.map((item, i) => (
            <FollowUpItem
              key={item?.id || item?.note + i}
              item={item}
              isLast={i === (followUps?.length ?? 0) - 1}
            />
          ))}
        </div>
      </CommonCard>
    </Reveal>
  );
}
