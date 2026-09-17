"use client";

import DetailCard from "@/components/common/DetailCard";
import { FileText } from "lucide-react";

export default function LeadDocumentsCard() {
  return (
    <DetailCard title="Documents">
      <div className="flex flex-col items-center justify-center p-6 text-center border border-dashed border-border rounded-lg bg-white">
        <div className="size-8 rounded-full bg-secondary/60 flex items-center justify-center text-muted-foreground mb-2">
          <FileText className="size-4" />
        </div>
        <p className="font-montserrat font-semibold text-[13px] text-foreground">
          No documents attached
        </p>
        <p className="font-montserrat text-[11px] text-muted-foreground mt-0.5 max-w-xs">
          Document storage and file uploads arrive with Document Vault (#22).
        </p>
      </div>
    </DetailCard>
  );
}
