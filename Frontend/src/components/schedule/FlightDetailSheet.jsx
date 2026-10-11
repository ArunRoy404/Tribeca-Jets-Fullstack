"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useScheduleStore } from "@/store/useScheduleStore";
import { useScheduleEvents } from "@/hooks/schedule";
import { formatLongDate, formatTime12, parseLocalDate } from "@/lib/date";
import DetailSheet from "@/components/common/DetailSheet";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/common/StatusBadge";
import DetailField from "@/components/common/DetailField";
import SectionCard from "@/components/common/SectionCard";
import FlightRouteStrip from "@/components/common/FlightRouteStrip";
import FlightEventCard from "@/components/common/FlightEventCard";

/**
 * One leg, or the full list of legs for a selected day, read from the
 * calendar's request. Clicking a day or "+N more" on the month grid opens
 * the day's total schedule; selecting one renders its full details with a
 * back link.
 */
export default function FlightDetailSheet() {
  const router = useRouter();
  const selectedEventId = useScheduleStore((s) => s.selectedEventId);
  const selectedDayDate = useScheduleStore((s) => s.selectedDayDate);
  const selectEvent = useScheduleStore((s) => s.selectEvent);
  const closeEventDetail = useScheduleStore((s) => s.closeEventDetail);
  const backToDayList = useScheduleStore((s) => s.backToDayList);
  const { eventById, eventsFor } = useScheduleEvents();

  const event = selectedEventId ? eventById(selectedEventId) : null;
  const dayDate = selectedDayDate ? parseLocalDate(selectedDayDate) : null;
  const dayEvents = dayDate ? eventsFor(dayDate) : [];

  const open = (href) => {
    closeEventDetail();
    router.push(href);
  };

  const isOpen = Boolean(event || (selectedDayDate && !selectedEventId));
  const showDayList = !selectedEventId && Boolean(selectedDayDate);

  return (
    <DetailSheet
      open={isOpen}
      onOpenChange={(openState) => !openState && closeEventDetail()}
      resetKey={selectedEventId || selectedDayDate}
      maxWidthClassName="sm:data-[side=right]:max-w-140"
    >
      {showDayList && dayDate && (
        <>
          <div className="border-b border-secondary flex flex-col gap-1.5 pb-4 w-full">
            <div className="flex items-center justify-between w-full">
              <p className="font-montserrat font-bold text-[20px] text-foreground">
                {formatLongDate(dayDate)}
              </p>
              <span className="font-montserrat text-[11px] font-semibold text-purple bg-purple/10 border border-purple/20 px-2.5 py-1 rounded-full">
                {dayEvents.length} {dayEvents.length === 1 ? "Flight" : "Flights"}
              </span>
            </div>
            <p className="font-montserrat text-[12px] text-muted-foreground">
              Select any scheduled flight below to view full operational details and itinerary.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 w-full pt-1">
            {dayEvents.map((evt) => (
              <FlightEventCard
                key={evt.id}
                event={evt}
                onClick={() => selectEvent(evt.id, selectedDayDate)}
              />
            ))}
            {dayEvents.length === 0 && (
              <p className="font-montserrat text-[13px] text-muted-foreground py-8 text-center">
                No flights scheduled for this day.
              </p>
            )}
          </div>
        </>
      )}

      {event && (
        <>
          {selectedDayDate && dayEvents.length > 1 && (
            <button
              type="button"
              onClick={backToDayList}
              className="flex items-center gap-1 text-[12px] font-montserrat font-semibold text-purple hover:underline cursor-pointer -mt-1 mb-1 w-fit"
            >
              <ChevronLeft className="size-4" />
              Back to {formatLongDate(dayDate)} ({dayEvents.length} flights)
            </button>
          )}

          <div className="border-b border-secondary flex items-start justify-between pb-4 w-full">
            <div className="flex flex-col gap-2 items-start">
              <div className="flex flex-wrap gap-2 items-center">
                <p className="font-montserrat font-bold text-[20px] text-foreground">{event?.title}</p>
                <StatusBadge status={event?.status} bordered />
                {event?.flightStatus && <StatusBadge status={event.flightStatus} bordered />}
              </div>
              <p className="font-montserrat font-normal text-[12px] text-muted-foreground">
                {event?.client}
                {event?.legLabel && ` · ${event.legLabel}`}
              </p>
            </div>
          </div>

          <FlightRouteStrip
            from={event?.from}
            to={event?.to}
            departureLabel={event?.time ? formatTime12(event.time) : "Time not set"}
            arrivalLabel={event?.arrivalTime ? formatTime12(event.arrivalTime) : "—"}
            duration={event?.duration}
          />

          <SectionCard title="Flight Information">
            <div className="flex gap-4 w-full">
              <DetailField label="DATE" value={event?.date ? formatLongDate(parseLocalDate(event.date)) : "—"} />
              <DetailField label="TYPE" value={event?.tripType} />
            </div>
            <div className="flex gap-4 w-full">
              <DetailField label="AIRCRAFT" value={event?.aircraft} />
              <DetailField label="TAIL NUMBER" value={event?.tailNumber} />
            </div>
            <div className="flex gap-4 w-full">
              <DetailField label="OPERATOR" value={event?.operator} />
              <DetailField label="OPERATOR CONFIRMED" value={event?.operatorConfirmed ? "Yes" : "Not yet"} />
            </div>
          </SectionCard>

          <SectionCard title="Trip Information">
            <div className="flex gap-4 w-full">
              <DetailField label="TRIP" value={event?.title} />
              <DetailField label="CLIENT" value={event?.client} />
            </div>
            <DetailField label="BROKER" value={event?.broker} />
          </SectionCard>

          <div className="bg-secondary border border-border flex flex-col gap-4 px-4 py-2 rounded-sm w-full">
            {event?.paymentStatus && (
              <div className="flex items-center justify-between w-full">
                <p className="font-dm-sans font-normal text-[12px] text-muted-foreground">Payment Status</p>
                <StatusBadge status={event.paymentStatus} bordered />
              </div>
            )}
            <div className="flex items-center justify-between w-full">
              <p className="font-dm-sans font-normal text-[12px] text-muted-foreground">FET Applied</p>
              <p className="font-montserrat font-bold text-[14px] text-foreground">{event?.fetApplied}</p>
            </div>
          </div>

          <div className="border-t border-secondary flex flex-col gap-2 pt-4 w-full mt-auto">
            {event?.tripId && (
              <Button className="w-full" onClick={() => open(`/dashboard/trips/${event.tripId}`)}>
                View Trip Details
              </Button>
            )}
            {event?.itinerary?.id && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => open(`/dashboard/itineraries?itinerary=${event.itinerary.id}`)}
              >
                View Itinerary
              </Button>
            )}
          </div>
        </>
      )}
    </DetailSheet>
  );
}
