"use client";

import { useScheduleStore } from "@/store/useScheduleStore";
import BgPanel from "@/components/common/BgPanel";
import ScheduleToolbar from "@/components/schedule/ScheduleToolbar";
import DateNavigator from "@/components/schedule/DateNavigator";
import DayAgenda from "@/components/schedule/DayAgenda";
import WeekGrid from "@/components/schedule/WeekGrid";
import MonthGrid from "@/components/schedule/MonthGrid";

export default function SchedulePanel() {
  const view = useScheduleStore((s) => s.view);

  return (
    <BgPanel
      src="/dashboard/bg/financial-attention.png"
      imageOpacity="opacity-50"
      blur="backdrop-blur-[24px]"
      gradient="from-white/90 to-[#e5eeff]/90"
      rounded="rounded-md"
      className="border border-border w-full"
      contentClassName="flex flex-col items-start w-full"
    >
      <div className="bg-sidebar w-full">
        <ScheduleToolbar />
      </div>
      <div className="w-full">
        <DateNavigator />
        {view === "Today" && <DayAgenda />}
        {view === "This Week" && <WeekGrid />}
        {view === "This Month" && <MonthGrid />}
      </div>
    </BgPanel>
  );
}
