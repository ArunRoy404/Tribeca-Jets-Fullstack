"use client";

import CommonCard from "@/components/common/CommonCard";
import SectionHeader from "@/components/common/SectionHeader";
import Reveal from "@/components/common/Reveal";
import ActivityItem from "@/components/dashboard/recent-activity/ActivityItem";
import { useDashboardStore } from "@/store/useDashboardStore";

export default function RecentActivityFeed({ revealDelay = 0 }) {
  const activity = useDashboardStore((s) => s.recentActivities);

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <SectionHeader
          title="Recent Activity"
          rightIcon="/dashboard/icons/refresh.svg"
          onRightClick={() => alert("Activity feed refreshed")}
        />

        <div className="relative flex flex-col items-start w-full">
          {activity?.map((item, i) => (
            <ActivityItem
              key={item?.id || item?.subject + i}
              item={item}
              isLast={i === (activity?.length ?? 0) - 1}
            />
          ))}
        </div>
      </CommonCard>
    </Reveal>
  );
}
