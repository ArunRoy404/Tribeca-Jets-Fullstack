"use client";

import { useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ImagePreviewStage from "./ImagePreviewStage";
import ImagePreviewControls from "./ImagePreviewControls";
import { useImageZoomPan } from "./useImageZoomPan";

/**
 * The full-screen lightbox: dark stage, zoom controls, prev/next when the
 * set has more than one image. Orchestrates `ImagePreviewStage` (the
 * viewport) and `ImagePreviewControls` (the zoom buttons) over one shared
 * `useImageZoomPan` instance, keyed to the active image so switching images
 * never carries the previous one's zoom/pan state along.
 */
export default function ImagePreviewModal({ open, onOpenChange, images, index, onIndexChange }) {
  const image = images[index];
  const hasMultiple = images.length > 1;
  const zoomPan = useImageZoomPan(image?.src);

  const goPrev = () => onIndexChange((index - 1 + images.length) % images.length);
  const goNext = () => onIndexChange((index + 1) % images.length);

  // Arrow keys and +/- only make sense while the lightbox itself is open —
  // Escape-to-close is already handled by the Dialog primitive.
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (hasMultiple && event.key === "ArrowLeft") goPrev();
      else if (hasMultiple && event.key === "ArrowRight") goNext();
      else if (event.key === "+" || event.key === "=") zoomPan.zoomIn();
      else if (event.key === "-") zoomPan.zoomOut();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // goPrev/goNext/zoomPan are recreated each render but only their current
    // closure matters here; re-binding per render is the correct behavior,
    // not a dependency to chase.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, hasMultiple, index]);

  if (!image) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-screen h-screen max-w-none sm:max-w-none p-0 gap-0 rounded-none bg-black/95 border-none flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 shrink-0 z-10">
          <p className="font-montserrat text-[13px] text-white/80 truncate pr-4">
            {image.alt}
            {hasMultiple && <span className="text-white/50"> · {index + 1} / {images.length}</span>}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <ImagePreviewControls zoomPan={zoomPan} />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-white hover:bg-white/15 hover:text-white"
              onClick={() => onOpenChange(false)}
              aria-label="Close preview"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        <ImagePreviewStage image={image} zoomPan={zoomPan} />

        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 -translate-y-1/2 size-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors cursor-pointer"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next image"
              className="absolute right-3 top-1/2 -translate-y-1/2 size-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors cursor-pointer"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
