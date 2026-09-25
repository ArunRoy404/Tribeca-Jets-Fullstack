"use client";

import { Upload } from "lucide-react";
import { useScheduleStore } from "@/store/useScheduleStore";
import { formatLongDate, formatTime12, parseLocalDate } from "@/lib/date";
import DetailSheet from "@/components/common/DetailSheet";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/common/StatusBadge";
import DetailField from "@/components/common/DetailField";
import SectionCard from "@/components/common/SectionCard";
import FlightRouteStrip from "@/components/common/FlightRouteStrip";

export default function FlightDetailSheet() {
  const selectedEventId = useScheduleStore((s) => s.selectedEventId);
  const closeEventDetail = useScheduleStore((s) => s.closeEventDetail);
  const getEventById = useScheduleStore((s) => s.getEventById);

  const event = selectedEventId ? getEventById(selectedEventId) : null;

  return (
    <DetailSheet
      open={!!event}
      onOpenChange={(open) => !open && closeEventDetail()}
      resetKey={selectedEventId}
      maxWidthClassName="sm:data-[side=right]:max-w-140"
    >
      {event && (
        <>
          <div className="border-b border-secondary flex items-start justify-between pb-4 w-full">
            <div className="flex flex-col gap-2 items-start">
              <div className="flex gap-2 items-center">
                <p className="font-montserrat font-bold text-[20px] text-foreground">{event.id}</p>
                <StatusBadge status={event.status} bordered />
              </div>
              <p className="font-montserrat font-normal text-[12px] text-muted-foreground">{event.client}</p>
            </div>
          </div>

          <FlightRouteStrip
            from={event.from}
            to={event.to}
            departureLabel={formatTime12(event.time)}
            arrivalLabel={formatTime12(event.arrivalTime)}
            duration={event.duration}
          />

          <SectionCard title="Flight Information">
            <div className="flex gap-4 w-full">
              <DetailField label="DATE" value={formatLongDate(parseLocalDate(event.date))} />
              <DetailField label="TYPE" value={event.tripType} />
            </div>
            <div className="flex gap-4 w-full">
              <DetailField label="AIRCRAFT" value={event.aircraft} />
              <DetailField label="TAIL NUMBER" value={event.tailNumber} />
            </div>
            <DetailField label="OPERATOR" value={event.operator} />
          </SectionCard>

          <SectionCard title="Trip Information">
            <div className="flex gap-4 w-full">
              <DetailField label="TRIP ID" value={event.tripId} />
              <DetailField label="CLIENT" value={event.client} />
            </div>
            <DetailField label="BROKER" value={event.broker} />
          </SectionCard>

          <div className="bg-secondary border border-border flex flex-col gap-4 px-4 py-2 rounded-sm w-full">
            <div className="flex items-center justify-between w-full">
              <p className="font-dm-sans font-normal text-[12px] text-muted-foreground">Payment Status</p>
              <StatusBadge status={event.paymentStatus} bordered />
            </div>
            <div className="flex items-center justify-between w-full">
              <p className="font-dm-sans font-normal text-[12px] text-muted-foreground">FET Applied</p>
              <p className="font-montserrat font-bold text-[14px] text-foreground">{event.fetApplied}</p>
            </div>
          </div>

          <div className="border-t border-secondary flex flex-col gap-2 pt-4 w-full mt-auto">
            <Button className="w-full">View Trip Details</Button>
            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1">Edit Schedule</Button>
              <Button variant="outline" className="flex-1">Update Status</Button>
            </div>
            <Button variant="outline" className="w-full gap-2">
              <Upload className="size-4" />
              Upload Operator Itinerary
            </Button>
          </div>
        </>
      )}
    </DetailSheet>
  );
}
