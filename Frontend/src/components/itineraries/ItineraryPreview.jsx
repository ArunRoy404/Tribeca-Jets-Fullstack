"use client";

import { FileText } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import DetailField from "@/components/common/DetailField";
import SectionCard from "@/components/common/SectionCard";
import { PhotoTile } from "@/components/common/photo-tile";
import { uploadUrl, passthroughImageLoader } from "@/services/uploads.service";

const STOCK_GALLERY = {
  exterior: "/itineraries/aircraft-exterior.jpg",
  interior: "/itineraries/aircraft-interior.jpg",
};

/**
 * The itinerary document body — everything between the Tribeca Jets
 * letterhead and the action buttons. Shared by `ItineraryDetailSheet` (a
 * saved record, in a `DetailSheet`) and `BuildItineraryDialog`'s live
 * preview pane (a record still being composed, updating on every keystroke).
 * One markup, two contexts, so the preview a broker builds against is
 * pixel-identical to what the sheet shows once it is saved.
 *
 * `item.exteriorImageUrl`/`item.interiorImageUrl` are per-record uploads;
 * the five seeded dummy itineraries have none, so they fall back to the
 * shared stock pair rather than showing a broken image.
 */
export default function ItineraryPreview({ item }) {
  if (!item) return null;

  const gallery = [
    {
      label: "Aircraft Exterior",
      src: item.exteriorImageUrl ? uploadUrl(item.exteriorImageUrl) : STOCK_GALLERY.exterior,
      isUpload: Boolean(item.exteriorImageUrl),
    },
    {
      label: "Aircraft Interior / Cabin",
      src: item.interiorImageUrl ? uploadUrl(item.interiorImageUrl) : STOCK_GALLERY.interior,
      isUpload: Boolean(item.interiorImageUrl),
    },
  ];
  // The set ImagePreview's lightbox navigates prev/next across — both
  // photos, whichever came from an upload vs. the stock fallback.
  const galleryImages = gallery.map((photo) => ({
    src: photo.src,
    alt: photo.label,
    loader: photo.isUpload ? passthroughImageLoader : undefined,
  }));

  return (
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
      <div className="grid grid-cols-2 gap-2 sm:gap-4 w-full">
        {gallery.map((photo, idx) => (
          <PhotoTile
            key={photo.label}
            src={photo.src}
            alt={photo.label}
            label={photo.label}
            images={galleryImages}
            index={idx}
            loader={photo.isUpload ? passthroughImageLoader : undefined}
          />
        ))}
      </div>

      {/* Trip ID & Client Row */}
      <div className="flex flex-col gap-1 border-t border-b border-secondary py-3 w-full">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-purple" />
          <span className="font-montserrat font-bold text-[18px] text-purple">{item.id || "New Itinerary"}</span>
        </div>
        <p className="font-montserrat font-medium text-[12px] text-muted-foreground">
          {item.client || "—"} • {item.from || "—"} → {item.to || "—"}
        </p>
      </div>

      {/* Summary Grid */}
      <SectionCard className="shadow-card">
        <div className="grid grid-cols-2 gap-4 w-full">
          <DetailField label="AIRCRAFT" value={item.aircraft || "—"} labelClassName="text-[12px]" />
          <DetailField label="OPERATOR" value={item.operator || "—"} labelClassName="text-[12px]" />
          <DetailField label="DATE" value={item.departureDate || "—"} labelClassName="text-[12px]" />
          <div className="flex flex-col gap-1">
            <p className="font-montserrat text-[12px] text-muted-foreground uppercase font-normal">TRIP STATUS</p>
            <div className="flex items-center">
              <StatusBadge status={item.tripStatus || "Booked"} bordered />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Flight Details Section */}
      <SectionCard title="Flight Details">
        <div className="flex flex-col gap-2.5 text-[13px] font-montserrat w-full">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Departure</span>
            <span className="font-bold text-foreground">{item.from || "—"} • {item.departureTime || "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Arrival</span>
            <span className="font-bold text-foreground">{item.to || "—"} • {item.arrivalTime || "—"}</span>
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
            <span className="font-bold text-foreground">{item.tailNumber || "—"}</span>
          </div>
          {(item.flightTime || item.miles) && (
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

      {/* Passengers Section */}
      <SectionCard title="Passengers">
        <div className="flex flex-col gap-2.5 w-full">
          {item.passengers && item.passengers.length > 0 ? (
            item.passengers.map((p, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-secondary/40 rounded-lg border border-border/50">
                <div className="size-9 rounded-full bg-purple text-white flex items-center justify-center font-montserrat font-bold text-[12px] shrink-0">
                  {p.initials || (p.name ? p.name.split(" ").map((n) => n[0]).join("") : "—")}
                </div>
                <div className="flex flex-col">
                  <p className="font-montserrat font-bold text-[13px] text-foreground">{p.name || "Unnamed passenger"}</p>
                  <p className="font-montserrat text-[11px] text-muted-foreground">Passport: {p.passport || "—"}</p>
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
            <span className="font-bold text-foreground">{item.catering || "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Ground Transport</span>
            <span className="font-bold text-foreground">{item.groundTransport || "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">FBO</span>
            <span className="font-bold text-foreground">{item.fbo || "—"}</span>
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
    </>
  );
}
