"use client";

import Link from "next/link";
import { ArrowLeft, Copy, Edit, FileDown, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function QuoteDetailHeader({
  quote,
  onEdit,
  onDuplicate,
  onDownloadPDF,
  onSendToClient,
}) {
  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Back button */}
      <div>
        <Link
          href="/dashboard/quotes"
          className="inline-flex items-center gap-1.5 font-montserrat text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span>Back</span>
        </Link>
      </div>

      {/* Main Title & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
        {/* Left: ID, VIP, Version */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-montserrat font-bold text-[22px] sm:text-[26px] text-foreground">
              {quote.id}
            </h1>
            {quote.clientTier === "VIP" && (
              <span className="px-2 py-0.5 rounded font-montserrat font-bold text-[11px] bg-warning/15 text-warning border border-warning/30">
                VIP
              </span>
            )}
          </div>
          <p className="font-montserrat text-[12px] sm:text-[13px] text-muted-foreground">
            {quote.version} • Sent {quote.sentDate}
          </p>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          <Button
            type="button"
            variant="outline"
            onClick={onDuplicate}
            className="h-9 px-3.5 font-montserrat font-medium text-[12px] gap-1.5 bg-white border-border shadow-xs hover:bg-muted/40 cursor-pointer"
          >
            <Copy className="size-3.5 text-muted-foreground" />
            <span>Duplicate</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onEdit}
            className="h-9 px-3.5 font-montserrat font-medium text-[12px] gap-1.5 bg-white border-border shadow-xs hover:bg-muted/40 cursor-pointer"
          >
            <Edit className="size-3.5 text-muted-foreground" />
            <span>Edit</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onDownloadPDF}
            className="h-9 px-3.5 font-montserrat font-medium text-[12px] gap-1.5 bg-white border-border shadow-xs hover:bg-muted/40 cursor-pointer"
          >
            <FileDown className="size-3.5 text-muted-foreground" />
            <span>Download PDF</span>
          </Button>

          <Button
            type="button"
            onClick={onSendToClient}
            className="h-9 px-4 font-montserrat font-medium text-[12px] gap-1.5 bg-[#252832] hover:bg-[#252832]/90 text-white shadow-button cursor-pointer"
          >
            <Send className="size-3.5" />
            <span>Send to Client</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

