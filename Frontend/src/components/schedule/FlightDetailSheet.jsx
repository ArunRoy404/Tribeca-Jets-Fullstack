"use client";

import { useRouter } from "next/navigation";
import { useScheduleStore } from "@/store/useScheduleStore";
import { useScheduleEvents } from "@/hooks/schedule";
import { formatLongDate, formatTime12, parseLocalDate } from "@/lib/date";
import DetailSheet from "@/components/common/DetailSheet";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/common/StatusBadge";
import DetailField from "@/components/common/DetailField";
import SectionCard from "@/components/common/SectionCard";
import FlightRouteStrip from "@/components/common/FlightRouteStrip";

/**
 * One leg, read from the calendar's own request. The calendar is read-only:
 * a leg is rescheduled and a status moved on the trip, so the old Edit
 * Schedule, Update Status and Upload Operator Itinerary buttons — which did
 * nothing — are gone, and the panel opens the trip and its itinerary instead.
 */
export default function FlightDetailSheet() {
  const router = useRouter();
  const selectedEventId = useScheduleStore((s) => s.selectedEventId);
  const closeEventDetail = useScheduleStore((s) => s.closeEventDetail);
  const { eventById } = useScheduleEvents();

  const event = selectedEventId ? eventById(selectedEventId) : null;
  const open = (href) => {
    closeEventDetail();
    router.push(href);
  };

  return (
    <DetailSheet
      open={!!event}
      onOpenChange={(isOpen) => !isOpen && closeEventDetail()}
      resetKey={selectedEventId}
      maxWidthClassName="sm:data-[side=right]:max-w-140"
    >
      {event && (
        <>
          <div className="border-b border-secondary flex items-start justify-between pb-4 w-full">
            <div className="flex flex-col gap-2 items-start">
              <div className="flex gap-2 items-center">
                <p className="font-montserrat font-bold text-[20px] text-foreground">{event?.title}</p>
                <StatusBadge status={event?.status} bordered />
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
