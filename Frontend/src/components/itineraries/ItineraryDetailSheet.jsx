"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Download, Send, FileText } from "lucide-react";
import { useItinerariesStore } from "@/store/useItinerariesStore";
import DetailSheet from "@/components/common/DetailSheet";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/common/StatusBadge";
import DetailField from "@/components/common/DetailField";
import SectionCard from "@/components/common/SectionCard";

const AIRCRAFT_GALLERY = [
  { label: "Aircraft Exterior", src: "/itineraries/aircraft-exterior.jpg" },
  { label: "Aircraft Interior / Cabin", src: "/itineraries/aircraft-interior.jpg" },
];

export default function ItineraryDetailSheet() {
  const router = useRouter();
  const selectedItineraryId = useItinerariesStore((s) => s.selectedItineraryId);
  const closeItineraryDetail = useItinerariesStore((s) => s.closeItineraryDetail);
  const getItineraryById = useItinerariesStore((s) => s.getItineraryById);
  const openSendModal = useItinerariesStore((s) => s.openSendModal);

  const item = selectedItineraryId ? getItineraryById(selectedItineraryId) : null;

  return (
    <DetailSheet
      open={!!item}
      onOpenChange={(open) => !open && closeItineraryDetail()}
      resetKey={item?.id}
      bodyClassName="gap-6"
    >
      {item && (
        <>
          {/* Document Title Banner */}
          <div className="flex flex-col items-center justify-center text-center gap-1 py-2">
            <h2 className="font-montserrat font-bold text-[20px] tracking-[0.38em] text-foreground uppercase">
              ITINERARY
            </h2>
            <p className="font-montserrat text-[13px] text-muted-foreground">Passenger itinerary</p>
            <p className="font-montserrat font-medium text-[12px] text-muted-foreground">
              Tribeca Jets #: {item.quoteNumber || "TJ-2026-0001"}
            </p>
          </div>

          {/* Aircraft Photo Gallery */}
          <div className="grid grid-cols-2 gap-4 w-full">
            {AIRCRAFT_GALLERY.map((photo) => (
              <div key={photo.label} className="relative w-full aspect-384.5/182 rounded border border-border overflow-hidden">
                <Image src={photo.src} alt={photo.label} fill className="object-cover" />
                <div className="absolute top-0 inset-x-0 flex items-center justify-center bg-secondary px-2 py-2.5">
                  <p className="font-montserrat font-bold text-[16px] text-foreground text-center">{photo.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Trip ID & Client Row */}
          <div className="flex flex-col gap-1 border-t border-b border-secondary py-3 w-full">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-purple" />
              <span className="font-montserrat font-bold text-[18px] text-purple">{item.id}</span>
            </div>
            <p className="font-montserrat font-medium text-[12px] text-muted-foreground">
              {item.client} • {item.from} → {item.to}
            </p>
          </div>

          {/* Summary Grid */}
          <SectionCard className="shadow-card">
            <div className="grid grid-cols-2 gap-4 w-full">
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
          </SectionCard>

          {/* Flight Details Section */}
          <SectionCard title="Flight Details">
            <div className="flex flex-col gap-2.5 text-[13px] font-montserrat w-full">
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
          </SectionCard>

          {/* Passengers Section */}
          <SectionCard title="Passengers">
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
          </SectionCard>

          {/* Additional Services Section */}
          <SectionCard title="Additional Services">
            <div className="flex flex-col gap-2.5 text-[13px] font-montserrat w-full">
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
          </SectionCard>

          {/* Departure / Arrival FBO Details */}
          {(item.departureFbo || item.arrivalFbo) && (
            <div className="grid grid-cols-2 gap-4 w-full">
              {[
                { key: "departure", label: "Departure FBO", fbo: item.departureFbo },
                { key: "arrival", label: "Arrival FBO", fbo: item.arrivalFbo },
              ].map(({ key, label, fbo }) =>
                fbo ? (
                  <div key={key} className="flex flex-col gap-1.5 p-3 bg-popover border border-border rounded font-montserrat text-foreground">
                    <p className="font-bold text-[13px]">{label}: {fbo.name}</p>
                    <p className="text-[12px]"><span className="font-bold">Address:</span> {fbo.address}</p>
                    <p className="text-[12px]"><span className="font-bold">Phone:</span> {fbo.phone}</p>
                    <p className="text-[12px]"><span className="font-bold">Email:</span> {fbo.email}</p>
                  </div>
                ) : null
              )}
            </div>
          )}

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
        </>
      )}
    </DetailSheet>
  );
}
