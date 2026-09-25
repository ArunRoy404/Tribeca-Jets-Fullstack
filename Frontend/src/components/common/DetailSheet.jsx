"use client";

import { useRef, useEffect } from "react";
import TribecaLetterhead from "@/components/common/TribecaLetterhead";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/**
 * The shared shell for every record detail sheet/drawer — Sheet + SheetContent
 * plus the Tribeca Jets letterhead every one of them carries. A module composes
 * this instead of hand-rolling the header a 15th time.
 *
 * `resetKey` (typically the selected record's id) scrolls the sheet back to
 * top whenever it changes, so switching records while the sheet stays open
 * never leaves it scrolled to wherever the previous record left it.
 */
export default function DetailSheet({
  open,
  onOpenChange,
  resetKey,
  maxWidthClassName = "sm:data-[side=right]:max-w-175",
  bodyClassName,
  children,
}) {
  const contentRef = useRef(null);

  useEffect(() => {
    if (open && contentRef.current) {
      contentRef.current.scrollTop = 0;
      const timer = setTimeout(() => {
        if (contentRef.current) contentRef.current.scrollTop = 0;
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open, resetKey]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        ref={contentRef}
        className={cn("data-[side=right]:w-full p-6 overflow-y-auto", maxWidthClassName)}
      >
        <div className={cn("flex flex-col gap-4 w-full", bodyClassName)}>
          <TribecaLetterhead />
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
