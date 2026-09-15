"use client";

import { AlertCircle, Loader2, SearchX } from "lucide-react";

/**
 * The three states a data table is in when it has no rows to draw.
 *
 * Shared because every module's table needs all three, and because the states
 * are easy to conflate: rendering "no results found" while a request is still
 * in flight tells the user their filter matched nothing when nothing has been
 * asked yet, and rendering it after a failed request hides the failure
 * entirely.
 *
 * Returns null when there is nothing to say, so callers can drop it in
 * unconditionally.
 */
export default function TableStatus({
  isLoading,
  error,
  isEmpty,
  emptyMessage = "No results found.",
  emptyHint = "Try adjusting your search or filters.",
  onRetry,
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-10 w-full">
        <Loader2 className="size-5 animate-spin text-purple" />
        <p className="font-montserrat text-[12px] text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-10 w-full">
        <AlertCircle className="size-5 text-destructive" />
        <p className="font-montserrat font-semibold text-[13px] text-foreground">
          Could not load this list
        </p>
        {/* The API's message is more specific than anything generic here —
            "Your role does not allow this action" beats "Something failed". */}
        <p className="font-montserrat text-[12px] text-muted-foreground text-center max-w-sm">
          {error?.message || "Please try again."}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-1 font-montserrat text-[12px] font-semibold text-purple hover:underline cursor-pointer"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-10 w-full">
        <SearchX className="size-5 text-muted-foreground/60" />
        <p className="font-montserrat font-semibold text-[13px] text-foreground">
          {emptyMessage}
        </p>
        <p className="font-montserrat text-[12px] text-muted-foreground">{emptyHint}</p>
      </div>
    );
  }

  return null;
}
