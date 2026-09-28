"use client";

import { useScheduleStore } from "@/store/useScheduleStore";
import { useScheduleEvents, useScheduleParams } from "@/hooks/schedule";
import FlightEventCard from "@/components/common/FlightEventCard";

export default function DayAgenda() {
  const { currentDate } = useScheduleParams();
  const { eventsFor } = useScheduleEvents();
  const selectEvent = useScheduleStore((s) => s.selectEvent);
  const events = eventsFor(currentDate);

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
          <FlightEventCard key={event?.id} event={event} onClick={() => selectEvent(event?.id)} />
        ))}
      </div>
    </div>
  );
}
