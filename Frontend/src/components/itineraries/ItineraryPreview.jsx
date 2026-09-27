"use client";

import { FileText } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import DetailField from "@/components/common/DetailField";
import SectionCard from "@/components/common/SectionCard";
import { PhotoTile } from "@/components/common/photo-tile";
import { uploadUrl, passthroughImageLoader } from "@/services/uploads.service";

/**
 * The itinerary document body — everything between the Tribeca Jets
 * letterhead and the action buttons. Shared by `ItineraryDetailSheet` (a
 * saved record) and `BuildItineraryDialog`'s live preview pane (a record
 * still being composed). One markup, two contexts, so the preview a broker
 * builds against is pixel-identical to what the sheet shows once it is saved.
 *
 * Aircraft, operator, tail, route, dates and passengers are the trip's own
 * facts — this component only ever reads them, never invents a fallback for
 * a trip that has none yet. `item.exteriorImageUrl`/`interiorImageUrl` are
 * already the *effective* photo (a document override, or the aircraft's own
 * fleet photo) — computed once, by the API or by the form's own preview
 * builder, never twice.
 */
export default function ItineraryPreview({ item }) {
  if (!item) return null;

  const gallery = [
    { label: "Aircraft Exterior", src: item.exteriorImageUrl ? uploadUrl(item.exteriorImageUrl) : null },
    { label: "Aircraft Interior / Cabin", src: item.interiorImageUrl ? uploadUrl(item.interiorImageUrl) : null },
  ];
  // The set ImagePreview's lightbox navigates prev/next across — only the
  // photos that exist, so a missing one is not a blank slide.
  const present = gallery.filter((photo) => photo.src);
  const galleryImages = present.map((photo) => ({ src: photo.src, alt: photo.label, loader: passthroughImageLoader }));

  return (
    <>
      {/* Document Title Banner */}
      <div className="flex flex-col items-center justify-center text-center gap-1 py-2">
        <h2 className="font-montserrat font-bold text-[20px] tracking-[0.38em] text-foreground uppercase">
          ITINERARY
        </h2>
        <p className="font-montserrat text-[13px] text-muted-foreground">Passenger itinerary</p>
      </div>

      {/* Aircraft Photo Gallery */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 w-full">
        {gallery.map((photo) => (
          <PhotoTile
            key={photo.label}
            src={photo.src}
            alt={photo.label}
            label={photo.label}
            images={galleryImages}
            index={Math.max(present.indexOf(photo), 0)}
            loader={photo.src ? passthroughImageLoader : undefined}
          />
        ))}
      </div>

      {/* Trip ID & Client Row */}
      <div className="flex flex-col gap-1 border-t border-b border-secondary py-3 w-full">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-purple" />
          <span className="font-montserrat font-bold text-[18px] text-purple">{item.tripReference || "New Itinerary"}</span>
        </div>
        <p className="font-montserrat font-medium text-[12px] text-muted-foreground">
          {item.client || "—"} • {item.originCode || "—"} → {item.destinationCode || "—"}
        </p>
      </div>

      {/* Summary Grid */}
      <SectionCard className="shadow-card">
        <div className="grid grid-cols-2 gap-4 w-full">
          <DetailField label="AIRCRAFT" value={item.aircraft || "—"} labelClassName="text-[12px]" />
          <DetailField label="OPERATOR" value={item.operator || "—"} labelClassName="text-[12px]" />
          <DetailField label="DATE" value={item.departureDateLabel || "—"} labelClassName="text-[12px]" />
          <div className="flex flex-col gap-1">
            <p className="font-montserrat text-[12px] text-muted-foreground uppercase font-normal">TRIP STATUS</p>
            <div className="flex items-center">
              <StatusBadge status={item.tripStatus || "—"} bordered />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Flight Details Section */}
      <SectionCard title="Flight Details">
        <div className="flex flex-col gap-2.5 text-[13px] font-montserrat w-full">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Departure</span>
            <span className="font-bold text-foreground">{item.originCode || "—"} • {item.departureTime || "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Arrival</span>
            <span className="font-bold text-foreground">{item.destinationCode || "—"} • {item.arrivalTimeLabel || "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Aircraft</span>
            <span className="font-bold text-foreground">{item.aircraft || "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Operator</span>
            <span className="font-bold text-foreground">{item.operator || "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Tail #</span>
            <span className="font-bold text-foreground">{item.aircraftTail || "—"}</span>
          </div>
          {(item.flightTime !== "—" || item.miles !== "—") && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Flight Time</span>
                <span className="font-bold text-foreground">{item.flightTime || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Miles</span>
                <span className="font-bold text-foreground">{item.miles || "—"}</span>
              </div>
            </>
          )}
        </div>
      </SectionCard>

      {/* Passengers Section — the trip's own manifest, read-only here */}
      <SectionCard title="Passengers">
        <div className="flex flex-col gap-2.5 w-full">
          {item.passengers && item.passengers.length > 0 ? (
            item.passengers.map((p) => {
              const initials = p.fullName
                ? p.fullName.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase()
                : "—";
              return (
                <div key={p.id} className="flex items-center gap-3 p-3 bg-secondary/40 rounded-lg border border-border/50">
                  <div className="size-9 rounded-full bg-purple text-white flex items-center justify-center font-montserrat font-bold text-[12px] shrink-0">
                    {initials}
                  </div>
                  <div className="flex flex-col">
                    <p className="font-montserrat font-bold text-[13px] text-foreground">{p.fullName || "Unnamed passenger"}</p>
                    <p className="font-montserrat text-[11px] text-muted-foreground">Passport: {p.passportNumber || "—"}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="font-montserrat text-[12px] text-muted-foreground text-center py-2">
              No passengers named on this trip yet.
            </p>
          )}
        </div>
      </SectionCard>

      {/* Additional Services Section */}
      <SectionCard title="Additional Services">
        <div className="flex flex-col gap-2.5 text-[13px] font-montserrat w-full">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Catering</span>
            <span className="font-bold text-foreground">{item.catering || "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Ground Transport</span>
            <span className="font-bold text-foreground">{item.groundTransport || "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Departure FBO</span>
            <span className="font-bold text-foreground">{item.departureFbo || "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Arrival FBO</span>
            <span className="font-bold text-foreground">{item.arrivalFbo || "—"}</span>
          </div>
        </div>
      </SectionCard>
    </>
  );
}
