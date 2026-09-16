"use client";

import { RotateCcw } from "lucide-react";

/**
 * Marks a row in the live table that was archived and brought back.
 *
 * Deliberately quiet — an outline, not a status pill — because it annotates a
 * record rather than describing its state. It stays for the life of the
 * record: a table that stops mentioning this after thirty days is a table that
 * silently changed what it tells you.
 */
export default function RestoredBadge({ at, by, className = "" }) {
  const detail = [by && by !== "—" ? `by ${by}` : null, at].filter(Boolean).join(" · ");

  return (
    <span
      title={detail ? `Restored ${detail}` : "Restored"}
      className={`inline-flex items-center gap-1 rounded-sm border border-border bg-secondary/40 px-1.5 py-0.5 font-montserrat text-[10px] font-medium text-muted-foreground whitespace-nowrap ${className}`}
    >
      <RotateCcw className="size-2.5" />
      Restored
    </span>
  );
}
