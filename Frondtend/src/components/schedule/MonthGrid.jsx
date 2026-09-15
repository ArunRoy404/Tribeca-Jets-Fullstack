"use client";

import { cn } from "@/lib/utils";
import { useScheduleStore } from "@/store/useScheduleStore";
import { getMonthGrid, isSameDay, formatShortDay, dayLabel } from "@/lib/date";
import FlightEventCard from "@/components/common/FlightEventCard";

const WEEKDAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const WEEKDAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];
// Keep to 1 chip + "+N more": a 92px cell can't comfortably fit 2 full chips (day number +
// 2 two-line chips runs ~84px against ~76px of usable height once cell padding is subtracted),
// and letting flexbox squeeze the overflow silently collapses the id/route line to 0 height
// (its `truncate` class gives it an automatic flex min-size of 0, so it's what gives way first).
const MAX_VISIBLE_EVENTS = 1;

export default function MonthGrid() {
  const currentDate = useScheduleStore((s) => s.currentDate);
  const getEventsForDate = useScheduleStore((s) => s.getEventsForDate);
  const selectEvent = useScheduleStore((s) => s.selectEvent);
  const goToDate = useScheduleStore((s) => s.goToDate);
  const weeks = getMonthGrid(currentDate);
  const selectedDayEvents = getEventsForDate(currentDate);
  const currentMonth = currentDate.getMonth();

  return (
    <>
      <div className="flex flex-col gap-3 p-4 w-full lg:hidden">
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAY_INITIALS.map((label, i) => (
            <p key={i} className="font-montserrat font-bold text-[10px] text-muted-foreground text-center">
              {label}
            </p>
          ))}
        </div>
        <div className="flex flex-col gap-1">
          {weeks.map((week) => (
            <div key={week[0].toISOString()} className="grid grid-cols-7 gap-1">
              {week.map((day) => {
                const inMonth = day.getMonth() === currentMonth;
                const eventCount = getEventsForDate(day).length;
                const isSelected = isSameDay(day, currentDate);
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => inMonth && goToDate(day)}
                    disabled={!inMonth}
                    className={cn(
                      "relative flex flex-col items-center justify-center gap-0.5 aspect-square rounded-md text-[12px] font-montserrat cursor-pointer",
                      !inMonth && "opacity-0 pointer-events-none",
                      isSelected ? "bg-primary text-primary-foreground font-bold" : "bg-white text-foreground hover:bg-secondary"
                    )}
                  >
                    {day.getDate()}
                    {eventCount > 0 && (
                      <span
                        className={cn(
                          "absolute bottom-1 size-1 rounded-full",
                          isSelected ? "bg-primary-foreground" : "bg-info"
                        )}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <p className="font-montserrat font-bold text-[12px] text-foreground pt-1">{formatShortDay(currentDate)}</p>

        <div className="flex flex-col gap-2">
          {selectedDayEvents.map((event) => (
            <FlightEventCard key={event.id} event={event} onClick={() => selectEvent(event.id)} />
          ))}
          {selectedDayEvents.length === 0 && (
            <p className="font-montserrat text-[12px] text-muted-foreground py-6 text-center">
              No flights scheduled for this day.
            </p>
          )}
        </div>
      </div>

      <div className="hidden lg:flex flex-col items-start w-full p-4">
      <div className="grid grid-cols-7 w-full border-l border-t border-secondary">
        {weeks[0].map((day) => (
          <div
            key={`head-${day.toISOString()}`}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 pt-1 pb-2 border-b border-r border-secondary bg-white",
              isSameDay(day, currentDate) && "bg-purple/5"
            )}
          >
            <p className="font-montserrat font-bold text-[12px] text-foreground">{dayLabel(day)}</p>
            <p className="font-montserrat text-[12px] text-muted-foreground">{formatShortDay(day)}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col w-full border-l border-secondary">
        {weeks.map((week) => (
          <div key={week[0].toISOString()} className="grid grid-cols-7 w-full">
            {week.map((day) => {
              const events = getEventsForDate(day);
              const visibleEvents = events.slice(0, MAX_VISIBLE_EVENTS);
              const overflowCount = events.length - visibleEvents.length;
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "flex flex-col gap-[5px] items-start h-[92px] p-2 border-b border-r border-secondary bg-white overflow-hidden",
                    isSameDay(day, currentDate) && "bg-purple/5"
                  )}
                >
                  <p className="font-montserrat font-bold text-[16px] text-foreground shrink-0">{day.getDate()}</p>
                  {visibleEvents.map((event) => {
                    const isInFlight = event.status === "In Flight";
                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => selectEvent(event.id)}
                        className={cn(
                          "flex flex-col gap-px items-start px-[7px] py-1 rounded-[5px] w-full text-left cursor-pointer overflow-hidden shrink-0",
                          isInFlight ? "bg-warning/10" : "bg-secondary"
                        )}
                      >
                        <p className="font-montserrat font-bold text-[8px] text-foreground truncate w-full shrink-0">
                          {event.id} • {event.from} → {event.to}
                        </p>
                        <p className={cn("font-montserrat font-normal text-[8px] shrink-0", isInFlight ? "text-warning" : "text-info")}>
                          {event.status}
                        </p>
                      </button>
                    );
                  })}
                  {overflowCount > 0 && (
                    <p className="font-montserrat font-medium text-[8px] text-muted-foreground shrink-0">+{overflowCount} more</p>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        </div>
      </div>
    </>
  );
}
