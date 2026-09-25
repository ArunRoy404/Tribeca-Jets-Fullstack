"use client";

import Image from "next/image";
import { Camera } from "lucide-react";
import { ImagePreview } from "@/components/common/image-preview";
import { cn } from "@/lib/utils";

/**
 * One labeled photo tile — an aircraft exterior/interior shot, on a document
 * preview. Hover-to-zoom via `ImagePreview` when a photo is present; a
 * dashed empty state, the same footprint, when it is not.
 *
 * The one sizing every caller shares: `aspect-4/3` on mobile (room for the
 * label without it eating the photo), `sm:aspect-384.5/182` restoring the
 * original wide document-photo ratio at tablet/desktop. First built for
 * `ItineraryPreview`'s two-photo gallery; `AddQuoteDialog`'s single aircraft
 * photo is the second caller, which is what pulled it out of that file
 * instead of growing a second, slightly-different copy.
 */
export default function PhotoTile({
  src,
  alt,
  label,
  images,
  index = 0,
  loader,
  emptyText = "No photo added yet",
  className,
}) {
  // `shrink-0` matters as much as the aspect ratio itself: this tile sits in
  // a `flex-col` preview pane that scrolls past the viewport, and a flex item
  // with `overflow-hidden` and no explicit height loses its aspect-ratio
  // floor in the browser's automatic-minimum-size calculation — it collapses
  // toward zero height under its taller siblings instead of scrolling with
  // them. `shrink-0` is what keeps the reserved space fixed regardless.
  const sizing = cn("w-full shrink-0 aspect-4/3 sm:aspect-384.5/182 rounded border overflow-hidden", className);

  if (!src) {
    return (
      <div
        className={cn(
          sizing,
          "border-dashed border-border flex flex-col items-center justify-center gap-1.5 text-muted-foreground",
        )}
      >
        <Camera className="size-5 sm:size-6" />
        <p className="font-montserrat text-[11px] sm:text-[12px] text-center px-2">{emptyText}</p>
      </div>
    );
  }

  return (
    <ImagePreview images={images} index={index} className={cn(sizing, "border-border")}>
      <Image src={src} alt={alt} fill className="object-cover" loader={loader} />
      {/* Wide-aspect desktop tile has room for the label on one line at full
          size; the taller mobile tile keeps it legible by shrinking the type
          instead of letting a wrapped 16px label eat the tile. */}
      {label && (
        <div className="absolute top-0 inset-x-0 flex items-center justify-center bg-secondary px-1.5 py-1 sm:px-2 sm:py-2.5">
          <p className="font-montserrat font-bold text-[10px] sm:text-[16px] leading-tight text-foreground text-center">
            {label}
          </p>
        </div>
      )}
    </ImagePreview>
  );
}
