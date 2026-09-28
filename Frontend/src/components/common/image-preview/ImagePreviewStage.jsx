"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The zoomable/pannable viewport — purely presentational. All zoom/pan
 * *state* lives in the `zoomPan` object (see `useImageZoomPan`), owned by
 * the modal and shared with `ImagePreviewControls`; this component only
 * wires the gesture handlers to the DOM and renders the transform.
 */
export default function ImagePreviewStage({ image, zoomPan }) {
  return (
    <div
      className="relative flex-1 min-h-0 w-full overflow-hidden flex items-center justify-center select-none touch-none"
      onWheel={zoomPan.onWheel}
      onPointerDown={zoomPan.onPointerDown}
      onPointerMove={zoomPan.onPointerMove}
      onPointerUp={zoomPan.onPointerUp}
      onPointerLeave={zoomPan.onPointerUp}
      onDoubleClick={zoomPan.onDoubleClick}
      style={{ cursor: zoomPan.isZoomed ? (zoomPan.isDragging ? "grabbing" : "grab") : "zoom-in" }}
    >
      <div
        className={cn("relative w-[92%] h-[92%]", !zoomPan.isDragging && "transition-transform duration-150 ease-out")}
        style={{ transform: `translate(${zoomPan.position.x}px, ${zoomPan.position.y}px) scale(${zoomPan.scale})` }}
      >
        <Image
          src={image.src}
          alt={image.alt || "Preview"}
          fill
          className="object-contain pointer-events-none"
          loader={image.loader}
          sizes="92vw"
          draggable={false}
          priority
        />
      </div>
    </div>
  );
}
