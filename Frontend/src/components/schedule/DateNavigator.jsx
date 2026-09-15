"use client";

import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useScheduleStore } from "@/store/useScheduleStore";
import { formatLongDate } from "@/lib/date";
import { Button } from "@/components/ui/button";
import FilterTabs from "@/components/table/common/FilterTabs";

const VIEW_OPTIONS = ["Today", "This Week", "This Month"];

export default function DateNavigator() {
  const view = useScheduleStore((s) => s.view);
  const setView = useScheduleStore((s) => s.setView);
  const currentDate = useScheduleStore((s) => s.currentDate);
  const goToday = useScheduleStore((s) => s.goToday);
  const goPrev = useScheduleStore((s) => s.goPrev);
  const goNext = useScheduleStore((s) => s.goNext);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 w-full">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="size-8 rounded-lg shadow-sm" onClick={goPrev}>
            <ChevronLeft className="size-4" />
          </Button>
          <button
            type="button"
            onClick={goToday}
            className="bg-white shadow-sm rounded-sm px-2 py-1 font-montserrat font-medium text-[14px] text-foreground cursor-pointer"
          >
            Today
          </button>
          <Button variant="outline" size="icon" className="size-8 rounded-lg shadow-sm" onClick={goNext}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <p className="font-montserrat font-medium text-[14px] text-foreground whitespace-nowrap">
            {formatLongDate(currentDate)}
          </p>
          <button
            type="button"
            onClick={() => setView("Year")}
            aria-label="View full year"
            className="cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <Calendar className="size-4" />
          </button>
        </div>
      </div>

      <FilterTabs options={VIEW_OPTIONS} value={view} onValueChange={setView} />
    </div>
  );
}
