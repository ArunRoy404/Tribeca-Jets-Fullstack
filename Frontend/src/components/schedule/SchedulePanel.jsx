"use client";

import BgPanel from "@/components/common/BgPanel";
import TableStatus from "@/components/table/common/TableStatus";
import ScheduleToolbar from "@/components/schedule/ScheduleToolbar";
import DateNavigator from "@/components/schedule/DateNavigator";
import DayAgenda from "@/components/schedule/DayAgenda";
import WeekGrid from "@/components/schedule/WeekGrid";
import MonthGrid from "@/components/schedule/MonthGrid";
import { useScheduleEvents, useScheduleParams } from "@/hooks/schedule";

export default function SchedulePanel() {
  const { view } = useScheduleParams();
  const { isPending, error, refetch, truncated, total, events } = useScheduleEvents();

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
        {truncated && (
          <p className="mx-4 mb-2 rounded-sm bg-warning/10 px-3 py-2 font-montserrat text-[12px] text-warning">
            Showing the first {events?.length} of {total} flights in this range. Narrow the filters to see the rest.
          </p>
        )}
        {isPending || error ? (
          <TableStatus isLoading={isPending} error={error} isEmpty={false} onRetry={refetch} />
        ) : (
          <>
            {view === "day" && <DayAgenda />}
            {view === "week" && <WeekGrid />}
            {view === "month" && <MonthGrid />}
          </>
        )}
      </div>
    </BgPanel>
  );
}
