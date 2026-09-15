"use client";

import CommonCard from "@/components/common/CommonCard";
import SectionHeader from "@/components/common/SectionHeader";
import Reveal from "@/components/common/Reveal";
import PriorityItem from "@/components/dashboard/todays-priorities/PriorityItem";
import { useDashboardStore } from "@/store/useDashboardStore";

export default function TodaysPriorities({ revealDelay = 0 }) {
  const priorities = useDashboardStore((s) => s.todaysPriorities);

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <SectionHeader
          title="Today's Priorities"
          badgeCount={priorities?.length}
          rightText="Aug 9"
        />

        <div className="relative flex flex-col items-start w-full">
          {priorities?.map((item, i) => (
            <PriorityItem
              key={item?.title + i}
              item={item}
              isLast={i === (priorities?.length ?? 0) - 1}
            />
          ))}
        </div>
      </CommonCard>
    </Reveal>
  );
}
