"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useScheduleParams } from "@/hooks/schedule";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import BgPanel from "@/components/common/BgPanel";

const NAV_PILLS = [
  { label: "Today", onSelect: (params) => params.showDate("day", params.today) },
  { label: "Day", onSelect: (params) => params.setView("day") },
  { label: "Week", onSelect: (params) => params.setView("week") },
  { label: "Month", onSelect: (params) => params.setView("month") },
];

/**
 * The year overview's header. "Add Flight" was a button that did nothing; a
 * flight on this calendar is a trip leg, so it is now New Trip — shown only to
 * a role that may book one.
 */
export default function YearHeader() {
  const params = useScheduleParams();
  const { canWrite } = usePermissions();

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
        {params.currentDate.getFullYear()} Schedule Overview
      </p>
      <div className="flex-1 min-w-4" />
      <div className="flex flex-wrap items-center gap-2">
        {NAV_PILLS.map((pill) => (
          <button
            key={pill.label}
            type="button"
            onClick={() => pill.onSelect(params)}
            className="bg-white/80 h-[30px] px-3 py-1.5 rounded-[7px] font-montserrat font-medium text-[11px] text-foreground/85 cursor-pointer hover:bg-white"
          >
            {pill.label}
          </button>
        ))}
        <div className="bg-primary h-[30px] px-3 py-1.5 rounded-[7px] font-montserrat font-medium text-[11px] text-primary-foreground">
          Year
        </div>
        {canWrite(Permission.MANAGE_TRIPS) && (
          <Link
            href="/dashboard/trips/new"
            className={cn(
              "bg-primary h-[30px] px-3 py-1.5 rounded-[7px] flex items-center gap-1",
              "font-montserrat font-medium text-[11px] text-primary-foreground cursor-pointer hover:bg-primary/90"
            )}
          >
            <Plus className="size-3" />
            New Trip
          </Link>
        )}
      </div>
    </BgPanel>
  );
}
