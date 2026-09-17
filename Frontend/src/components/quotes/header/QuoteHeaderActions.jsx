"use client";

import { Copy, Pencil, FileDown, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function QuoteHeaderActions({
  onDuplicate,
  onEdit,
  onDownloadPDF,
  onSendToClient,
}) {
  return (
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
        <Pencil className="size-3.5 text-muted-foreground" />
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
  );
}
