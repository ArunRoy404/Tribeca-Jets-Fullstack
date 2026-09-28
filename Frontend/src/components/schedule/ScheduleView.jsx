"use client";

import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import Reveal from "@/components/common/Reveal";
import SchedulePanel from "@/components/schedule/SchedulePanel";
import YearOverview from "@/components/schedule/YearOverview";
import FlightDetailSheet from "@/components/schedule/FlightDetailSheet";
import { useScheduleParams, useScheduleStats } from "@/hooks/schedule";
import { toScheduleStats } from "@/lib/schedule";
import { toISODate } from "@/lib/date";

/**
 * Schedule (#13) — the calendar of trip legs, API-backed and read-only. The
 * tiles are counted by the API under the same filters as the calendar, with
 * the browser's own day as "today".
 */
export default function ScheduleView() {
  const params = useScheduleParams();
  const { data: stats } = useScheduleStats({ ...params.filterParams, on: toISODate(params.today) });

  return (
    <>
      <div className="flex flex-col gap-6 px-4 sm:px-6 py-6 pb-8">
        <SimpleStatsRow stats={toScheduleStats(stats)} bgSrc="/dashboard/bg/financial-attention.png" />
        <Reveal>{params.view === "year" ? <YearOverview /> : <SchedulePanel />}</Reveal>
      </div>

      <FlightDetailSheet />
    </>
  );
}
