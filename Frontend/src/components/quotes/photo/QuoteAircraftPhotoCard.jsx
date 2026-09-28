"use client";

import DetailCard from "@/components/quotes/DetailCard";
import { PhotoTile } from "@/components/common/photo-tile";
import { uploadUrl, passthroughImageLoader } from "@/services/uploads.service";

/**
 * The aircraft photograph on a saved quote.
 *
 * The create/edit form previews it and stores it in `exteriorImageUrl`; until
 * this card existed nothing showed it once the form was closed, so the photo a
 * broker picked for the client was only ever visible while editing. No photo
 * renders `PhotoTile`'s dashed empty state — never a stock picture of some
 * other airframe standing in for this one.
 */
export default function QuoteAircraftPhotoCard({ quote }) {
  if (!quote) return null;

  const src = quote.exteriorImageUrl ? uploadUrl(quote.exteriorImageUrl) : null;

  return (
    <DetailCard title="Aircraft Photo">
      <PhotoTile
        src={src}
        alt="Aircraft exterior"
        images={src ? [{ src, alt: "Aircraft exterior", loader: passthroughImageLoader }] : undefined}
        loader={passthroughImageLoader}
        emptyText="No photo on this quote"
      />
    </DetailCard>
  );
}
