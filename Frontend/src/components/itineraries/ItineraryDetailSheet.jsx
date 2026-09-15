"use client";

import { useRef, useEffect } from "react";
import Logo from "@/components/common/Logo";
import { useRouter } from "next/navigation";
import { Download, Send } from "lucide-react";
import { useItinerariesStore } from "@/store/useItinerariesStore";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/common/StatusBadge";
import DetailField from "@/components/common/DetailField";

export default function ItineraryDetailSheet() {
  const router = useRouter();
  const selectedItineraryId = useItinerariesStore((s) => s.selectedItineraryId);
  const closeItineraryDetail = useItinerariesStore((s) => s.closeItineraryDetail);
  const getItineraryById = useItinerariesStore((s) => s.getItineraryById);
  const openSendModal = useItinerariesStore((s) => s.openSendModal);

  const item = selectedItineraryId ? getItineraryById(selectedItineraryId) : null;
  const contentRef = useRef(null);

  useEffect(() => {
    if (item && contentRef.current) {
      contentRef.current.scrollTop = 0;
      const timer = setTimeout(() => {
        if (contentRef.current) contentRef.current.scrollTop = 0;
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [item]);

  return (
    <Sheet open={!!item} onOpenChange={(open) => !open && closeItineraryDetail()}>
      <SheetContent
        ref={contentRef}
        className="data-[side=right]:w-full sm:data-[side=right]:max-w-175 gap-5 p-6 overflow-y-auto"
      >
        {item && (
          <div className="flex flex-col gap-6 w-full">
            {/* Header Document Branding */}
            <div className="flex items-start justify-between border-b border-border pb-4 w-full">
              <div className="flex items-center">
                <Logo variant="black" className="h-12 w-auto" />
              </div>
              <div className="flex flex-col items-end text-[11px] font-montserrat text-muted-foreground">
                <p className="font-semibold text-foreground">Tribeca Jets</p>
                <p>www.tribecajets.com</p>
                <p>fly@tribecajets.com</p>
              </div>
            </div>

            {/* Document Title Banner */}
            <div className="flex flex-col items-center justify-center text-center gap-1 py-2">
              <h2 className="font-montserrat font-bold text-[20px] tracking-widest text-foreground uppercase">
                CHARTER QUOTE
              </h2>
              <p className="font-montserrat text-[13px] text-muted-foreground">Client</p>
              <p className="font-montserrat font-medium text-[12px] text-muted-foreground">
                Tribeca Jets #: {item.quoteNumber || "TJ-2026-0001"}
              </p>
            </div>

            {/* Trip ID & Client Row */}
            <div className="flex flex-col gap-1 border-t border-b border-secondary py-3 w-full">
              <div className="flex items-center gap-2">
                <span className="font-montserrat font-bold text-[18px] text-purple">{item.id}</span>
              </div>
              <p className="font-montserrat font-medium text-[12px] text-muted-foreground">
                {item.client} • {item.from} → {item.to}
              </p>
            </div>

            {/* Summary Grid Box */}
            <div className="border border-border rounded-lg p-4 bg-white shadow-card grid grid-cols-2 gap-4">
              <DetailField label="AIRCRAFT" value={item.aircraft} labelClassName="text-[12px]" />
              <DetailField label="OPERATOR" value={item.operator} labelClassName="text-[12px]" />
              <DetailField label="DATE" value={item.departureDate} labelClassName="text-[12px]" />
              <div className="flex flex-col gap-1">
                <p className="font-montserrat text-[12px] text-muted-foreground uppercase font-normal">TRIP STATUS</p>
                <div className="flex items-center">
                  <StatusBadge status={item.tripStatus} bordered />
                </div>
              </div>
            </div>

            {/* Flight Details Section */}
            <div className="flex flex-col gap-3 w-full">
              <h3 className="font-montserrat font-bold text-[15px] text-foreground border-b border-border/40 pb-2">
                Flight Details
              </h3>
              <div className="flex flex-col gap-2.5 text-[13px] font-montserrat">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Departure</span>
                  <span className="font-bold text-foreground">{item.from} • {item.departureTime}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Arrival</span>
                  <span className="font-bold text-foreground">{item.to} • {item.arrivalTime}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Aircraft</span>
                  <span className="font-bold text-foreground">{item.aircraft}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Operator</span>
                  <span className="font-bold text-foreground">{item.operator}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tail #</span>
                  <span className="font-bold text-foreground">{item.tailNumber}</span>
                </div>
              </div>
            </div>

            {/* Passengers Section */}
            <div className="flex flex-col gap-3 w-full">
              <h3 className="font-montserrat font-bold text-[15px] text-foreground border-b border-border/40 pb-2">
                Passengers
              </h3>
              <div className="flex flex-col gap-2.5 w-full">
                {item.passengers && item.passengers.length > 0 ? (
                  item.passengers.map((p, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-secondary/40 rounded-lg border border-border/50">
                      <div className="size-9 rounded-full bg-purple text-white flex items-center justify-center font-montserrat font-bold text-[12px] shrink-0">
                        {p.initials || p.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div className="flex flex-col">
                        <p className="font-montserrat font-bold text-[13px] text-foreground">{p.name}</p>
                        <p className="font-montserrat text-[11px] text-muted-foreground">Passport: {p.passport}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="font-montserrat text-[12px] text-muted-foreground text-center py-2">No passengers listed.</p>
                )}
              </div>
            </div>

            {/* Additional Services Section */}
            <div className="flex flex-col gap-3 w-full">
              <h3 className="font-montserrat font-bold text-[15px] text-foreground border-b border-border/40 pb-2">
                Additional Services
              </h3>
              <div className="flex flex-col gap-2.5 text-[13px] font-montserrat">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Catering</span>
                  <span className="font-bold text-foreground">{item.catering}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Ground Transport</span>
                  <span className="font-bold text-foreground">{item.groundTransport}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">FBO</span>
                  <span className="font-bold text-foreground">{item.fbo}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2.5 pt-4 border-t border-border w-full mt-auto">
              <Button
                variant="outline"
                className="w-full h-10 text-[13px] gap-2 font-medium"
                onClick={() => alert("Downloading PDF itinerary document...")}
              >
                <Download className="size-4" />
                Download PDF
              </Button>

              <Button
                variant="outline"
                className="w-full h-10 text-[13px] gap-2 font-medium"
                onClick={() => openSendModal(item.id)}
              >
                <Send className="size-4" />
                Send to Client
              </Button>

              <Button
                className="w-full h-11 text-[14px] font-medium"
                onClick={() => {
                  closeItineraryDetail();
                  router.push(`/dashboard/trips/${encodeURIComponent(item.id.replace("#", ""))}`);
                }}
              >
                View Trip Details
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
