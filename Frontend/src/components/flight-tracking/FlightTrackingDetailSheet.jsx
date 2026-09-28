"use client";

import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import DetailSheet from "@/components/common/DetailSheet";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/common/StatusBadge";
import DetailField from "@/components/common/DetailField";
import SectionCard from "@/components/common/SectionCard";
import FlightRouteStrip from "@/components/common/FlightRouteStrip";
import NotesTimeline from "@/components/notes/NotesTimeline";
import FlightReportForm from "@/components/flight-tracking/FlightReportForm";
import { useFlight } from "@/hooks/flight-tracking";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission } from "@/lib/permissions";
import { toFlightRow } from "@/lib/flight";
import { timelineExactTime, timelineTime } from "@/lib/timeline";

/**
 * One flight: its trip's facts, the state the desk last reported, the report
 * form for a role that may manage trips, and its updates — the shared notes
 * timeline on subject FLIGHT, which replays every report from the audit log
 * beside the notes written about it. The old "Live Status" percentage is gone:
 * nothing records where a flight is.
 */
export default function FlightTrackingDetailSheet({ flightId, onClose }) {
  const router = useRouter();
  const { canWrite } = usePermissions();
  const { data } = useFlight(flightId);
  const flight = data ? toFlightRow(data) : null;
  const mayReport = canWrite(Permission.MANAGE_TRIPS) && flight?.reportable;

  return (
    <DetailSheet
      open={Boolean(flightId) && Boolean(flight)}
      onOpenChange={(open) => !open && onClose?.()}
      resetKey={flightId}
      bodyClassName="gap-5"
    >
      {flight && (
        <>
          <div className="border-b border-secondary flex items-start justify-between pb-4 w-full">
            <div className="flex flex-col gap-1.5 items-start">
              <div className="flex gap-2.5 items-center">
                <p className="font-montserrat font-bold text-[22px] text-black-text">{flight?.reference}</p>
                <StatusBadge status={flight?.flightStatus} bordered />
              </div>
              <p className="font-montserrat font-medium text-[13px] text-muted-foreground">
                {flight?.client} • <span className="font-bold text-foreground">{flight?.tailNumber}</span>
                {flight?.legLabel && ` • ${flight.legLabel}`}
              </p>
              {flight?.reportedAt && (
                <p className="font-montserrat text-[11px] text-muted-foreground" title={timelineExactTime(flight.reportedAt)}>
                  Status reported {timelineTime(flight.reportedAt)}
                </p>
              )}
            </div>
          </div>

          <FlightRouteStrip
            from={flight?.origin}
            to={flight?.destination}
            departureLabel={flight?.departureTime}
            arrivalLabel={`ETA ${flight?.eta}`}
            duration={flight?.etaSource === "itinerary" ? "ETA from itinerary" : flight?.etaSource === "reported" ? "ETA as reported" : ""}
          />

          <SectionCard>
            <div className="grid grid-cols-2 gap-4 w-full">
              <DetailField label="AIRCRAFT" value={flight?.aircraft} labelClassName="text-[12px] font-normal" />
              <DetailField label="OPERATOR" value={flight?.operator} labelClassName="text-[12px] font-normal" />
            </div>
            <div className="grid grid-cols-2 gap-4 w-full pt-2">
              <DetailField label="DEPARTURE" value={flight?.departure} labelClassName="text-[12px] font-normal" />
              <div className="flex flex-col gap-1">
                <p className="font-montserrat text-[12px] text-muted-foreground uppercase font-normal">TRIP STATUS</p>
                <div className="flex items-center">
                  <StatusBadge status={flight?.tripStatus} bordered />
                </div>
              </div>
            </div>
            {flight?.trackingUrl && (
              <a
                href={flight.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 pt-2 font-montserrat font-medium text-[12px] text-purple hover:underline"
              >
                <ExternalLink className="size-3.5" />
                Open tracking page
              </a>
            )}
          </SectionCard>

          {mayReport && (
            <FlightReportForm key={`${flight?.id}-${data?.updatedAt ?? ""}-${flight?.reportedAt ?? ""}`} flight={flight} />
          )}

          <div className="flex flex-col w-full pt-2 gap-2">
            <h3 className="font-montserrat font-bold text-[18px] text-foreground">Flight Updates</h3>
            <NotesTimeline subjectType="FLIGHT" subjectId={flight?.id} />
          </div>

          <div className="border-t border-secondary flex flex-col items-start pt-4 w-full mt-auto">
            <Button
              className="w-full h-11 text-[14px] font-medium"
              onClick={() => {
                onClose?.();
                if (flight?.tripId) router.push(`/dashboard/trips/${flight.tripId}`);
              }}
            >
              View Trip Details
            </Button>
          </div>
        </>
      )}
    </DetailSheet>
  );
}
