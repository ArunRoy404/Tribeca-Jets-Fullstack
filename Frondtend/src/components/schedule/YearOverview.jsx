"use client";

import { useScheduleStore } from "@/store/useScheduleStore";
import YearHeader from "@/components/schedule/YearHeader";
import MonthMiniCard from "@/components/schedule/MonthMiniCard";

export default function YearOverview() {
  const currentDate = useScheduleStore((s) => s.currentDate);
  const year = currentDate.getFullYear();

  return (
    <div className="flex flex-col gap-3 w-full">
      <YearHeader />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 w-full">
        {Array.from({ length: 12 }, (_, month) => (
          <MonthMiniCard key={month} year={year} month={month} />
        ))}
      </div>
    </div>
  );
}
