"use client";

import { Plus } from "lucide-react";
import { useScheduleStore } from "@/store/useScheduleStore";
import { cn } from "@/lib/utils";
import BgPanel from "@/components/common/BgPanel";

const NAV_PILLS = [
  { label: "Today", onSelect: (setView, goToday) => { goToday(); setView("Today"); } },
  { label: "Day", onSelect: (setView) => setView("Today") },
  { label: "Week", onSelect: (setView) => setView("This Week") },
  { label: "Month", onSelect: (setView) => setView("This Month") },
];

export default function YearHeader() {
  const currentDate = useScheduleStore((s) => s.currentDate);
  const setView = useScheduleStore((s) => s.setView);
  const goToday = useScheduleStore((s) => s.goToday);

  return (
    <BgPanel
      src="/dashboard/bg/financial-attention.png"
      imageOpacity="opacity-30"
      blur="backdrop-blur-2xl"
      gradient="from-white/80 to-[#e5eeff]/80"
      rounded="rounded-lg"
      className="border border-border w-full"
      contentClassName="flex flex-wrap gap-2 items-center pl-4 pr-3 py-2.5 w-full"
    >
      <p className="font-montserrat font-medium text-[14px] text-foreground whitespace-nowrap">
        {currentDate.getFullYear()} Schedule Overview
      </p>
      <div className="flex-1 min-w-4" />
      <div className="flex flex-wrap items-center gap-2">
        {NAV_PILLS.map((pill) => (
          <button
            key={pill.label}
            type="button"
            onClick={() => pill.onSelect(setView, goToday)}
            className="bg-white/80 h-[30px] px-3 py-1.5 rounded-[7px] font-montserrat font-medium text-[11px] text-foreground/85 cursor-pointer hover:bg-white"
          >
            {pill.label}
          </button>
        ))}
        <div className="bg-primary h-[30px] px-3 py-1.5 rounded-[7px] font-montserrat font-medium text-[11px] text-primary-foreground">
          Year
        </div>
        <button
          type="button"
          className={cn(
            "bg-primary h-[30px] px-3 py-1.5 rounded-[7px] flex items-center gap-1",
            "font-montserrat font-medium text-[11px] text-primary-foreground cursor-pointer hover:bg-primary/90"
          )}
        >
          <Plus className="size-3" />
          Add Flight
        </button>
      </div>
    </BgPanel>
  );
}
