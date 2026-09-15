"use client";

import { useScheduleStore } from "@/store/useScheduleStore";
import { scheduleStats } from "@/dummyData/schedule";
import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import Reveal from "@/components/common/Reveal";
import SchedulePanel from "@/components/schedule/SchedulePanel";
import YearOverview from "@/components/schedule/YearOverview";
import FlightDetailSheet from "@/components/schedule/FlightDetailSheet";

export default function ScheduleView() {
  const view = useScheduleStore((s) => s.view);
  const isYear = view === "Year";
  const stats = isYear ? scheduleStats?.filter((stat) => stat?.label !== "Completed") : scheduleStats;

  return (
    <>
      <div className="flex flex-col gap-6 px-4 sm:px-6 py-6 pb-8">
        <SimpleStatsRow stats={stats} bgSrc="/dashboard/bg/financial-attention.png" />
        <Reveal>{isYear ? <YearOverview /> : <SchedulePanel />}</Reveal>
      </div>

      <FlightDetailSheet />
    </>
  );
}
