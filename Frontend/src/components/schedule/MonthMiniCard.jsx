"use client";

import { cn } from "@/lib/utils";
import { useScheduleStore } from "@/store/useScheduleStore";
import { getMonthGrid, isSameDay } from "@/lib/date";
import BgPanel from "@/components/common/BgPanel";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function MonthMiniCard({ year, month }) {
  const currentDate = useScheduleStore((s) => s.currentDate);
  const goToDate = useScheduleStore((s) => s.goToDate);
  const setView = useScheduleStore((s) => s.setView);
  const getEventsForMonth = useScheduleStore((s) => s.getEventsForMonth);
  const getEventsForDate = useScheduleStore((s) => s.getEventsForDate);
  const selectEvent = useScheduleStore((s) => s.selectEvent);

  const monthDate = new Date(year, month, 1);
  const weeks = getMonthGrid(monthDate);
  const flightCount = getEventsForMonth(year, month).length;

  const openDay = (day) => {
    const events = getEventsForDate(day);
    if (events.length > 0) {
      selectEvent(events[0].id);
      return;
    }
    goToDate(day);
    setView("This Month");
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
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => inMonth && openDay(day)}
                disabled={!inMonth}
                className={cn(
                  "flex-1 min-w-0 h-6 flex items-start justify-start p-1 rounded text-[8px] font-montserrat font-normal text-left",
                  inMonth ? "bg-white/70 text-foreground/80 cursor-pointer hover:bg-secondary" : "text-transparent",
                  inMonth && isSameDay(day, currentDate) && "bg-purple/10 text-purple font-medium"
                )}
              >
                {inMonth ? day.getDate() : ""}
              </button>
            );
          })}
        </div>
      ))}
    </BgPanel>
  );
}
