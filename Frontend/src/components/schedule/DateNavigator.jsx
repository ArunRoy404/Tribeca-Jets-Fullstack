"use client";

import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { formatLongDate } from "@/lib/date";
import { SCHEDULE_VIEW_LABELS } from "@/lib/schedule";
import { useScheduleParams } from "@/hooks/schedule";
import { Button } from "@/components/ui/button";
import FilterTabs from "@/components/table/common/FilterTabs";

const VIEWS = ["day", "week", "month"];
const VIEW_BY_LABEL = Object.fromEntries(VIEWS.map((view) => [SCHEDULE_VIEW_LABELS[view], view]));

export default function DateNavigator() {
  const params = useScheduleParams();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 w-full">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="size-8 rounded-lg shadow-sm" onClick={params.goPrev}>
            <ChevronLeft className="size-4" />
          </Button>
          <button
            type="button"
            onClick={params.goToday}
            className="bg-white shadow-sm rounded-sm px-2 py-1 font-montserrat font-medium text-[14px] text-foreground cursor-pointer"
          >
            Today
          </button>
          <Button variant="outline" size="icon" className="size-8 rounded-lg shadow-sm" onClick={params.goNext}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <p className="font-montserrat font-medium text-[14px] text-foreground whitespace-nowrap">
            {formatLongDate(params.currentDate)}
          </p>
          <button
            type="button"
            onClick={() => params.setView("year")}
            aria-label="View full year"
            className="cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <Calendar className="size-4" />
          </button>
        </div>
      </div>

      <FilterTabs
        options={VIEWS.map((view) => SCHEDULE_VIEW_LABELS[view])}
        value={SCHEDULE_VIEW_LABELS[params.view]}
        onValueChange={(label) => params.setView(VIEW_BY_LABEL[label] ?? "day")}
      />
    </div>
  );
}
