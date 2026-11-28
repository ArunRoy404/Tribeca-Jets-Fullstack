"use client";

import DetailCard from "@/components/quotes/DetailCard";
import { PhotoTile } from "@/components/common/photo-tile";
import { uploadUrl, passthroughImageLoader } from "@/services/uploads.service";

/** The same exterior/interior gallery on saved offers and live previews.
 * A missing quote override falls back to that aircraft's photo only. */
export default function QuoteAircraftPhotoCard({ quote }) {
  if (!quote) return null;

  const photos = [
    { url: quote.exteriorImageUrl ?? quote.aircraft?.exteriorImageUrl, alt: "Aircraft exterior" },
    { url: quote.interiorImageUrl ?? quote.aircraft?.interiorImageUrl, alt: "Aircraft interior" },
  ];
  const images = photos.filter((photo) => photo.url).map((photo) => ({ src: uploadUrl(photo.url), alt: photo.alt, loader: passthroughImageLoader }));

  return (
    <DetailCard title="Aircraft Photos">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
        {photos.map((photo) => <PhotoTile key={photo.alt} src={photo.url ? uploadUrl(photo.url) : null} alt={photo.alt} label={photo.alt} images={images} loader={passthroughImageLoader} emptyText="No photo on file" />)}
      </div>
    </DetailCard>
  );
}
