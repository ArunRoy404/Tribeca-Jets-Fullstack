"use client";

import { FileText } from "lucide-react";

/**
 * Awaiting its module.
 *
 * This tab rendered a hardcoded array until the Clients module was wired to
 * the API. Nothing on the server can supply it yet, so it says so rather than
 * showing rows that were never real.
 */
export default function ClientQuotesTab() {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-md border border-border w-full">
      <FileText className="size-10 text-muted-foreground/50 mb-3" />
      <p className="font-montserrat font-bold text-[16px] text-foreground">No Quotes Yet</p>
      <p className="font-montserrat text-[13px] text-muted-foreground mt-1">
        Quotes prepared for this client will appear here.
      </p>
    </div>
  );
}
