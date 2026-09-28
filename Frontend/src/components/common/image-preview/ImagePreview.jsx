"use client";

import { useState } from "react";
import { Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import ImagePreviewModal from "./ImagePreviewModal";

/**
 * The one component every uploaded or gallery image in this app previews
 * through — see the rule in `AGENTS.md`. Wraps an existing thumbnail with
 * hover-to-preview (a dark scrim + expand icon) and, on click, a
 * full-screen zoom/pan lightbox seeded on this image.
 *
 * It wraps markup rather than rendering its own thumbnail, so it composes
 * with whatever a call site already draws — an upload brick with its own
 * remove button sitting *outside* this wrapper, a bordered gallery card
 * with its own label bar — without needing to know about any of that.
 *
 * Pass the *whole* set an image belongs to as `images`, and this item's
 * position in it as `index` — not just the one image — so prev/next in the
 * lightbox stays within the group a thumbnail visually belongs to (every
 * photo on a `multiple` upload field, both sides of a two-photo gallery).
 * A single image is simply a one-item set with no visible nav arrows.
 */
export default function ImagePreview({ images, index = 0, className, children }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(index);

  const openPreview = () => {
    setActiveIndex(index);
    setOpen(true);
  };

  return (
    <>
      <div className={cn("relative group/preview", className)}>
        {children}
        <button
          type="button"
          onClick={openPreview}
          className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all cursor-zoom-in group-hover/preview:bg-black/30 group-hover/preview:opacity-100 focus-visible:opacity-100 focus-visible:bg-black/30 outline-none"
          aria-label="Preview image"
        >
          <Maximize2 className="size-5 text-white drop-shadow" />
        </button>
      </div>
      <ImagePreviewModal
        open={open}
        onOpenChange={setOpen}
        images={images}
        index={activeIndex}
        onIndexChange={setActiveIndex}
      />
    </>
  );
}
