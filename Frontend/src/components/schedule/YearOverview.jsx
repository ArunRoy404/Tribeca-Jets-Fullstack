"use client";

import YearHeader from "@/components/schedule/YearHeader";
import MonthMiniCard from "@/components/schedule/MonthMiniCard";
import TableStatus from "@/components/table/common/TableStatus";
import { useScheduleCalendar, useScheduleParams } from "@/hooks/schedule";

/** The year at a glance: legs counted per month and per day by the API. */
export default function YearOverview() {
  const params = useScheduleParams();
  const year = params.currentDate.getFullYear();
  const { data: calendar, isPending, error, refetch } = useScheduleCalendar({ year, ...params.filterParams });

  return (
    <div className="flex flex-col gap-3 w-full">
      <YearHeader />
      {isPending || error ? (
        <TableStatus isLoading={isPending} error={error} isEmpty={false} onRetry={refetch} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 w-full">
          {Array.from({ length: 12 }, (_, month) => (
            <MonthMiniCard
              key={month}
              year={year}
              month={month}
              flightCount={calendar?.months?.[month] ?? 0}
              dayCounts={calendar?.days ?? {}}
            />
          ))}
        </div>
      )}
    </div>
  );
}
