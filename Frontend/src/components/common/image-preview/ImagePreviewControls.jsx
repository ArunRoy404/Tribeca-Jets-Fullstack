"use client";

import { Minus, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The zoom in/out/reset row — purely presentational, reading and calling
 * back into the `zoomPan` object the modal owns. Its own atomic piece so
 * the modal's header markup stays readable and this row is trivially
 * reusable if a future surface wants zoom controls without the rest of
 * the modal chrome.
 */
export default function ImagePreviewControls({ zoomPan }) {
  return (
    <div className="flex items-center gap-0.5 bg-white/10 rounded-md p-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="text-white hover:bg-white/15 hover:text-white"
        onClick={zoomPan.zoomOut}
        disabled={!zoomPan.canZoomOut}
        aria-label="Zoom out"
      >
        <Minus className="size-4" />
      </Button>
      <span className="font-montserrat text-[12px] text-white/80 tabular-nums w-11 text-center select-none">
        {Math.round(zoomPan.scale * 100)}%
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="text-white hover:bg-white/15 hover:text-white"
        onClick={zoomPan.zoomIn}
        disabled={!zoomPan.canZoomIn}
        aria-label="Zoom in"
      >
        <Plus className="size-4" />
      </Button>
      {zoomPan.isZoomed && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-white hover:bg-white/15 hover:text-white"
          onClick={zoomPan.reset}
          aria-label="Reset zoom"
        >
          <RotateCcw className="size-3.5" />
        </Button>
      )}
    </div>
  );
}
