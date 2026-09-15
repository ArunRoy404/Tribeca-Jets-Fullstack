"use client";

import { useScheduleStore } from "@/store/useScheduleStore";
import FlightEventCard from "@/components/common/FlightEventCard";

export default function DayAgenda() {
  const currentDate = useScheduleStore((s) => s.currentDate);
  const getEventsForDate = useScheduleStore((s) => s.getEventsForDate);
  const selectEvent = useScheduleStore((s) => s.selectEvent);
  // Re-reads current search/filter state internally on every render (cheap array filter over a small dummy set),
  // so this intentionally isn't memoized against those fields.
  const events = getEventsForDate(currentDate);

  return (
    <div className="flex flex-col gap-3 p-4 w-full">
      <div className="flex flex-col gap-0.5 border-b border-secondary pb-2">
        <p className="font-montserrat font-bold text-[12px] text-foreground">
          {currentDate.toLocaleDateString(undefined, { weekday: "long" }).toUpperCase()}
        </p>
      </div>
      {events.length === 0 && (
        <p className="font-montserrat text-[12px] text-muted-foreground py-6 text-center">
          No flights scheduled for this day.
        </p>
      )}
      <div className="flex flex-col gap-2 sm:max-w-md">
        {events.map((event) => (
          <FlightEventCard key={event.id} event={event} onClick={() => selectEvent(event.id)} />
        ))}
      </div>
    </div>
  );
}
