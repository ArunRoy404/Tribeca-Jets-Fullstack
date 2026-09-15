"use client";

import { useRouter } from "next/navigation";
import { Send, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { useFlightTrackingStore } from "@/store/useFlightTrackingStore";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/common/StatusBadge";
import DetailField from "@/components/common/DetailField";
import SectionCard from "@/components/common/SectionCard";
import FlightRouteStrip from "@/components/common/FlightRouteStrip";

export default function FlightTrackingDetailSheet() {
  const router = useRouter();
  const selectedFlightId = useFlightTrackingStore((s) => s.selectedFlightId);
  const closeFlightDetail = useFlightTrackingStore((s) => s.closeFlightDetail);
  const getFlightById = useFlightTrackingStore((s) => s.getFlightById);

  const flight = selectedFlightId ? getFlightById(selectedFlightId) : null;

  return (
    <Sheet open={!!flight} onOpenChange={(open) => !open && closeFlightDetail()}>
      <SheetContent className="data-[side=right]:w-full sm:data-[side=right]:max-w-175 gap-5 p-6 overflow-y-auto">
        {flight && (
          <>
            {/* Sheet Header */}
            <div className="border-b border-secondary flex items-start justify-between pb-4 w-full">
              <div className="flex flex-col gap-1.5 items-start">
                <div className="flex gap-2.5 items-center">
                  <p className="font-montserrat font-bold text-[22px] text-black-text">{flight.tripId}</p>
                  <StatusBadge status={flight.flightStatus} bordered />
                </div>
                <p className="font-montserrat font-medium text-[13px] text-muted-foreground">
                  {flight.client} • <span className="font-bold text-foreground">{flight.tailNumber}</span>
                </p>
              </div>
            </div>

            {/* Route Strip */}
            <FlightRouteStrip
              from={flight.origin}
              to={flight.destination}
              departureLabel={flight.departureTime}
              arrivalLabel={`ETA ${flight.etaTime}`}
              duration={flight.progressLabel}
            />

            {/* Progress Bar Container */}
            <div className="bg-secondary/50 rounded-lg p-3.5 flex flex-col gap-2 w-full border border-border">
              <div className="flex items-center justify-between text-[11px] font-montserrat">
                <span className="text-muted-foreground uppercase tracking-wider font-semibold">Live Status</span>
                <span className="font-bold text-purple">{flight.progressPercentage}% COMPLETE</span>
              </div>
              <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple transition-all duration-500 rounded-full"
                  style={{ width: `${flight.progressPercentage}%` }}
                />
              </div>
              <p className="font-montserrat text-[11px] text-muted-foreground font-medium">
                {flight.progressLabel}
              </p>
            </div>

            {/* Details SectionCard Grid */}
            <SectionCard>
              <div className="grid grid-cols-2 gap-4 w-full">
                <DetailField label="AIRCRAFT" value={flight.aircraft} labelClassName="text-[12px] font-normal" />
                <DetailField label="OPERATOR" value={flight.operator} labelClassName="text-[12px] font-normal" />
              </div>
              <div className="grid grid-cols-2 gap-4 w-full pt-2">
                <DetailField label="DATE" value={flight.departureDate} labelClassName="text-[12px] font-normal" />
                <div className="flex flex-col gap-1">
                  <p className="font-montserrat text-[12px] text-muted-foreground uppercase font-normal">TRIP STATUS</p>
                  <div className="flex items-center">
                    <StatusBadge status={flight.tripStatus} bordered />
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* Flight Updates Timeline */}
            <div className="flex flex-col w-full pt-2">
              <h3 className="font-montserrat font-bold text-[18px] text-foreground mb-1">
                Flight Updates
              </h3>

              <div className="flex flex-col w-full">
                {flight.updates && flight.updates.length > 0 ? (
                  flight.updates.map((update, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 py-3.5 border-b border-border/40 last:border-0"
                    >
                      <Clock className="size-4.5 text-muted-foreground stroke-[1.5] mt-0.5 shrink-0" />
                      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                        <p className="font-montserrat font-bold text-[14px] text-foreground leading-snug">
                          {update.text}
                        </p>
                        <p className="font-montserrat text-[13px] text-muted-foreground">
                          {update.time}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="font-montserrat text-[13px] text-muted-foreground py-4 text-center w-full">
                    No flight updates recorded yet.
                  </p>
                )}
              </div>
            </div>

            {/* Footer View Trip Details Action */}
            <div className="border-t border-secondary flex flex-col items-start pt-4 w-full mt-auto">
              <Button
                className="w-full h-11 text-[14px] font-medium"
                onClick={() => {
                  closeFlightDetail();
                  router.push(`/dashboard/trips/${encodeURIComponent(flight.id.replace("#", ""))}`);
                }}
              >
                View Trip Details
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
