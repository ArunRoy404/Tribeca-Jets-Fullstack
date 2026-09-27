"use client";

import DetailCard from "@/components/common/DetailCard";
import { PhotoTile } from "@/components/common/photo-tile";
import { uploadUrl, passthroughImageLoader } from "@/services/uploads.service";

/**
 * The fleet's own photographs of this tail — client adjustment #3's fleet
 * half. Exterior and interior, the same pair an itinerary shows.
 *
 * A slot with no photo renders `PhotoTile`'s dashed empty state, never a
 * stock picture of some other airframe. The lightbox only steps through the
 * photos that exist, so prev/next never lands on an empty slot.
 */
export default function AircraftPhotosCard({ aircraft }) {
  if (!aircraft) return null;

  const slots = [
    { key: "exterior", label: "Exterior", url: aircraft.exteriorImageUrl },
    { key: "interior", label: "Interior", url: aircraft.interiorImageUrl },
  ].map((slot) => ({ ...slot, src: slot.url ? uploadUrl(slot.url) : null }));

  const present = slots.filter((slot) => slot.src);
  const gallery = present.map((slot) => ({
    src: slot.src,
    alt: `${aircraft.tailNumber ?? "Aircraft"} ${slot.key}`,
    loader: passthroughImageLoader,
  }));

  return (
    <DetailCard title="PHOTOS">
      {/* Columns follow the card's own width, not the viewport's: the card
          sits in a narrow side column on desktop and full-width below `lg`,
          so a viewport breakpoint put two postage-stamp tiles side by side at
          tablet width. Two columns only when the card has room for them. */}
      <div className="@container w-full">
        <div className="grid grid-cols-1 @lg:grid-cols-2 gap-4 w-full">
          {slots.map((slot) => (
            <PhotoTile
              key={slot.key}
              src={slot.src}
              alt={`${aircraft.tailNumber ?? "Aircraft"} ${slot.key}`}
              label={slot.label}
              images={slot.src ? gallery : undefined}
              index={Math.max(0, present.findIndex((p) => p.key === slot.key))}
              loader={passthroughImageLoader}
              emptyText={`No ${slot.key} photo on file`}
            />
          ))}
        </div>
      </div>
    </DetailCard>
  );
}
