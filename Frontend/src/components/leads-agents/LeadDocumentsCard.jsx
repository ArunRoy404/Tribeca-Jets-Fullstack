"use client";

import DetailCard from "@/components/common/DetailCard";
import { UploadCloud } from "lucide-react";
import { useRef } from "react";

/**
 * LeadDocumentsCard
 *
 * API Integration Guidelines:
 * - Data source: `GET /api/clients/{id}/documents` (awaiting Documents module)
 * - Upload action: `POST /api/clients/{id}/documents` (multipart/form-data)
 *   - Payload: { file: File, clientId: string, category: "LEAD_ATTACHMENT" }
 *   - Accepted MIME types: application/pdf, image/jpeg, image/png
 *
 * When documents service lands, wire file selection to mutate query cache.
 */
export default function LeadDocumentsCard({ onUpload }) {
  const fileInputRef = useRef(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onUpload?.(files[0]);
    }
  };

  return (
    <DetailCard title="Documents">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png"
      />
      <div
        onClick={handleClick}
        className="flex flex-col items-center justify-center p-6 sm:p-8 rounded-lg border-2 border-dashed border-border/80 bg-secondary/10 hover:bg-secondary/20 transition-colors cursor-pointer text-center group"
      >
        <div className="size-10 rounded-full bg-white border border-border flex items-center justify-center text-muted-foreground group-hover:text-purple transition-colors mb-2">
          <UploadCloud className="size-5" />
        </div>
        <p className="font-montserrat text-[12px] sm:text-[13px] text-foreground">
          Drag &amp; drop files here or{" "}
          <span className="font-semibold text-purple underline underline-offset-2">
            Browse File
          </span>
        </p>
        <p className="font-montserrat text-[11px] text-muted-foreground mt-1">
          Support: PDF, JPG, PNG
        </p>
      </div>
    </DetailCard>
  );
}
