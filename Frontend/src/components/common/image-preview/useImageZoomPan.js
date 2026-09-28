"use client";

import { useCallback, useRef, useState } from "react";

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const ZOOM_STEP = 0.5;
const WHEEL_SENSITIVITY = 0.0025;

function clampScale(value) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
}

/**
 * Scale + pan state for one image inside `ImagePreviewStage`: wheel/pinch to
 * zoom, drag to pan once zoomed, double-click to toggle between 1x and 2x.
 *
 * Owned by `ImagePreviewModal` (not `ImagePreviewStage` itself) so the same
 * state can drive both the viewport's transform *and* the zoom buttons in
 * the header — two different components, one source of truth.
 *
 * `resetKey` clears zoom/pan whenever it changes. It must be the *active
 * image's* identity (its `src`), not the modal's open state — switching
 * images via prev/next must not carry the previous image's zoom and pan
 * offset onto the next one, but the modal itself stays mounted while open.
 */
export function useImageZoomPan(resetKey) {
  const [scale, setScale] = useState(MIN_SCALE);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  // Resetting on a changed `resetKey` belongs during render, not in an
  // effect — React's documented pattern for "adjusting state when a prop
  // changes." An effect would commit the still-zoomed frame first and only
  // reset on the next tick, showing a one-frame flash of the previous
  // image's zoom/pan on the new image.
  const [trackedKey, setTrackedKey] = useState(resetKey);
  if (trackedKey !== resetKey) {
    setTrackedKey(resetKey);
    setScale(MIN_SCALE);
    setPosition({ x: 0, y: 0 });
  }

  const reset = useCallback(() => {
    setScale(MIN_SCALE);
    setPosition({ x: 0, y: 0 });
  }, []);

  const applyScale = useCallback((updater) => {
    setScale((current) => {
      const next = clampScale(typeof updater === "function" ? updater(current) : updater);
      if (next === MIN_SCALE) setPosition({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const zoomIn = useCallback(() => applyScale((s) => s + ZOOM_STEP), [applyScale]);
  const zoomOut = useCallback(() => applyScale((s) => s - ZOOM_STEP), [applyScale]);

  const onWheel = useCallback(
    (event) => {
      event.preventDefault();
      applyScale((s) => s - event.deltaY * WHEEL_SENSITIVITY);
    },
    [applyScale],
  );

  const onDoubleClick = useCallback(() => {
    setScale((s) => (s > MIN_SCALE ? MIN_SCALE : 2));
    setPosition({ x: 0, y: 0 });
  }, []);

  const onPointerDown = useCallback(
    (event) => {
      if (scale <= MIN_SCALE) return;
      setIsDragging(true);
      dragStart.current = { x: event.clientX, y: event.clientY, posX: position.x, posY: position.y };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [scale, position],
  );

  const onPointerMove = useCallback(
    (event) => {
      if (!isDragging) return;
      setPosition({
        x: dragStart.current.posX + (event.clientX - dragStart.current.x),
        y: dragStart.current.posY + (event.clientY - dragStart.current.y),
      });
    },
    [isDragging],
  );

  const onPointerUp = useCallback(() => setIsDragging(false), []);

  return {
    scale,
    position,
    isDragging,
    isZoomed: scale > MIN_SCALE,
    canZoomIn: scale < MAX_SCALE,
    canZoomOut: scale > MIN_SCALE,
    zoomIn,
    zoomOut,
    reset,
    onWheel,
    onDoubleClick,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}
