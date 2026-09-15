"use client";

import { cn } from "@/lib/utils";
import { useScheduleStore } from "@/store/useScheduleStore";
import { addDays, startOfWeek, dayLabel, formatShortDay, isSameDay } from "@/lib/date";
import FlightEventCard from "@/components/common/FlightEventCard";

// Matches the Figma week-view hour rail order exactly (8 AM row leads, 7 AM follows).
const HOUR_ROWS = [
  { label: "8 AM", hour: 8 },
  { label: "7 AM", hour: 7 },
  { label: "9 AM", hour: 9 },
  { label: "10 AM", hour: 10 },
  { label: "11 AM", hour: 11 },
  { label: "12 PM", hour: 12 },
  { label: "1 PM", hour: 13 },
  { label: "2 PM", hour: 14 },
  { label: "3 PM", hour: 15 },
  { label: "4 PM", hour: 16 },
  { label: "5 PM", hour: 17 },
];
const ROW_HEIGHT = 72;

function slotForTime(time) {
  const [h, m] = time.split(":").map(Number);
  const index = HOUR_ROWS.findIndex((row) => row.hour === h);
  const clampedIndex = index === -1 ? (h < HOUR_ROWS[1].hour ? 1 : HOUR_ROWS.length - 1) : index;
  const minuteOffset = m >= 30 ? ROW_HEIGHT / 2 : 0;
  return clampedIndex * ROW_HEIGHT + minuteOffset;
}

export default function WeekGrid() {
  const currentDate = useScheduleStore((s) => s.currentDate);
  const getEventsForDate = useScheduleStore((s) => s.getEventsForDate);
  const selectEvent = useScheduleStore((s) => s.selectEvent);
  const goToDate = useScheduleStore((s) => s.goToDate);
  const weekStart = startOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const selectedDayEvents = getEventsForDate(currentDate);

  return (
    <>
      <div className="flex flex-col gap-3 p-4 w-full lg:hidden">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {weekDays.map((day) => {
            const isSelected = isSameDay(day, currentDate);
            const dayEvents = getEventsForDate(day);
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => goToDate(day)}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-2 shrink-0 min-w-13 cursor-pointer",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-white border border-border text-foreground"
                )}
              >
                <span className="font-montserrat font-medium text-[10px]">{dayLabel(day)}</span>
                <span className="font-montserrat font-bold text-[14px]">{day.getDate()}</span>
                {dayEvents.length > 0 && (
                  <span
                    className={cn(
                      "absolute top-1 right-1 size-1.5 rounded-full",
                      isSelected ? "bg-primary-foreground" : "bg-info"
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>

        <p className="font-montserrat font-bold text-[12px] text-foreground">{formatShortDay(currentDate)}</p>

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

      <div className="hidden lg:flex items-start w-full overflow-x-auto p-4">
      <div className="flex flex-col shrink-0 w-[52px]">
        <div className="h-[42px] shrink-0" />
        {HOUR_ROWS.map((row) => (
          <div key={row.label} className="flex items-center justify-end pr-2" style={{ height: ROW_HEIGHT }}>
            <p className="font-montserrat font-normal text-[12px] text-muted-foreground whitespace-nowrap">{row.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-1 min-w-[980px] border-l border-t border-secondary">
        {weekDays.map((day) => {
          const events = getEventsForDate(day);
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          return (
            <div key={day.toISOString()} className="flex flex-1 flex-col min-w-[130px] border-r border-secondary">
              <div
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 pt-1 pb-2 border-b border-secondary shadow-[inset_-1px_-1px_0px_0px_var(--border)]",
                  isSameDay(day, currentDate) ? "bg-purple/5" : "bg-white"
                )}
                style={{ height: 42 }}
              >
                <p className="font-montserrat font-bold text-[12px] text-foreground">{dayLabel(day)}</p>
                <p className="font-montserrat text-[12px] text-muted-foreground">{formatShortDay(day)}</p>
              </div>

              <div
                className={cn("relative", isWeekend && "bg-secondary/40")}
                style={{ height: ROW_HEIGHT * HOUR_ROWS.length }}
              >
                {HOUR_ROWS.map((row, index) => (
                  <div
                    key={row.label}
                    className="absolute inset-x-0 border-b border-secondary"
                    style={{ top: index * ROW_HEIGHT, height: ROW_HEIGHT }}
                  >
                    <div className="h-1/2 border-b border-secondary/50" />
                  </div>
                ))}

                {events.map((event) => (
                  <div key={event.id} className="absolute inset-x-1 z-10" style={{ top: slotForTime(event.time) }}>
                    <FlightEventCard event={event} onClick={() => selectEvent(event.id)} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </>
  );
}
