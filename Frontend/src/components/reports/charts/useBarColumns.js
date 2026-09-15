"use client";

import { useEffect, useRef, useState } from "react";

export default function useBarColumns({ itemCount, blockSize, gap = 2, barGap = 6, fallback = 3 }) {
  const containerRef = useRef(null);
  const [state, setState] = useState({ columns: fallback, containerWidth: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el || itemCount <= 0) return;

    const measure = () => {
      const width = el.clientWidth;
      if (!width) return;
      const availableWidth = width - (itemCount - 1) * barGap;
      const perItemWidth = availableWidth / itemCount;
      const computed = Math.floor((perItemWidth + gap) / (blockSize + gap));
      setState({ columns: Math.max(1, computed), containerWidth: width });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [itemCount, blockSize, gap, barGap]);

  return { containerRef, ...state };
}
