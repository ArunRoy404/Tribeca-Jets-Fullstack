"use client";

import { cn } from "@/lib/utils";
import { useScheduleParams } from "@/hooks/schedule";
import { getMonthGrid, isSameDay, toISODate } from "@/lib/date";
import BgPanel from "@/components/common/BgPanel";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * One month of the year overview. The counts come from the API's year
 * calendar; a day with flights opens in the day view, where each of them can
 * be read, and an empty day opens its month.
 */
export default function MonthMiniCard({ year, month, flightCount = 0, dayCounts = {} }) {
  const { currentDate, showDate } = useScheduleParams();

  const monthDate = new Date(year, month, 1);
  const weeks = getMonthGrid(monthDate);

  const openDay = (day) => {
    showDate((dayCounts?.[toISODate(day)] ?? 0) > 0 ? "day" : "month", day);
  };

  return (
    <BgPanel
      src="/dashboard/bg/financial-attention.png"
      imageOpacity="opacity-20"
      blur="backdrop-blur-2xl"
      gradient="from-white/80 to-[#e5eeff]/80"
      rounded="rounded-lg"
      className="border border-[#e0e0e5] w-full"
      contentClassName="flex flex-col gap-[7px] items-start p-2.5 w-full"
    >
      <div className="flex gap-1.5 items-center h-[22px] w-full">
        <p className="font-montserrat font-medium text-[12px] text-foreground whitespace-nowrap">
          {MONTH_LABELS[month]}
        </p>
        {flightCount > 0 && (
          <div className="bg-[#ebf0ff] flex items-center justify-center h-5 px-1.75 py-0.75 rounded-md">
            <p className="font-montserrat font-medium text-[9px] text-[#3359cc] whitespace-nowrap">
              {flightCount} {flightCount === 1 ? "flight" : "flights"}
            </p>
          </div>
        )}
      </div>

      <div className="flex font-montserrat font-medium gap-4 h-3.5 items-start text-[8px] text-muted-foreground w-full">
        {WEEKDAY_LABELS.map((label, i) => (
          <p key={i} className="flex-1 min-w-0 text-center">
            {label}
          </p>
        ))}
      </div>

      {weeks.map((week) => (
        <div key={week[0].toISOString()} className="flex gap-0.5 items-start h-6 w-full">
          {week.map((day) => {
            const inMonth = day.getMonth() === month;
            const hasFlights = inMonth && (dayCounts?.[toISODate(day)] ?? 0) > 0;
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => inMonth && openDay(day)}
                disabled={!inMonth}
                className={cn(
                  "relative flex-1 min-w-0 h-6 flex items-start justify-start p-1 rounded text-[8px] font-montserrat font-normal text-left",
                  inMonth ? "bg-white/70 text-foreground/80 cursor-pointer hover:bg-secondary" : "text-transparent",
                  inMonth && isSameDay(day, currentDate) && "bg-purple/10 text-purple font-medium"
                )}
              >
                {inMonth ? day.getDate() : ""}
                {hasFlights && <span className="absolute bottom-1 right-1 size-1 rounded-full bg-info" />}
              </button>
            );
          })}
        </div>
      ))}
    </BgPanel>
  );
}
