"use client";

import { Plus, UploadCloud } from "lucide-react";
import SectionCard from "@/components/common/SectionCard";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";

export default function LeadSidebarCards({ lead, onFollowUp }) {
  if (!lead) return null;

  const followUps = lead.followUpsList || [];

  return (
    <div className="flex flex-col gap-6 w-full min-w-0">
      {/* Card 1: Follow-ups */}
      <SectionCard
        title="Follow-ups"
        className="bg-white"
        action={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onFollowUp}
            className="h-7 px-2 font-montserrat text-[12px] font-medium text-purple hover:text-purple/80 hover:bg-purple/10 gap-1 cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span>Add</span>
          </Button>
        }
      >
        <div className="flex flex-col gap-3 w-full">
          {followUps.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 p-3 bg-[#f8f9fc] border border-[#eaecf2] rounded-lg"
            >
              <div className="flex flex-col min-w-0">
                <span className="font-montserrat font-semibold text-[13px] text-foreground">
                  {item.title}
                </span>
                <span className="font-montserrat text-[11px] text-muted-foreground">
                  {item.subtitle}
                </span>
              </div>
              <StatusBadge status={item.status || "Upcoming"} bordered />
            </div>
          ))}

          {followUps.length === 0 && (
            <div className="p-4 text-center text-muted-foreground font-montserrat text-[13px]">
              No scheduled follow-ups.
            </div>
          )}
        </div>
      </SectionCard>

      {/* Card 2: Internal Notes */}
      <SectionCard
        title="Internal Notes"
        className="bg-white"
        action={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => alert(`Add note for ${lead.name}`)}
            className="h-7 px-2 font-montserrat text-[12px] font-medium text-purple hover:text-purple/80 hover:bg-purple/10 gap-1 cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span>Add</span>
          </Button>
        }
      >
        <div className="p-3 bg-[#f8f9fc] border border-[#eaecf2] rounded-lg">
          <p className="font-montserrat text-[13px] text-foreground leading-relaxed">
            {lead.internalNotes || "High-value prospect. Referred by Hope Sterling."}
          </p>
        </div>
      </SectionCard>

      {/* Card 3: Documents Upload Dropzone */}
      <SectionCard
        title="Documents"
        className="bg-white"
        action={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => alert(`Upload document for ${lead.name}`)}
            className="h-7 px-2 font-montserrat text-[12px] font-medium text-purple hover:text-purple/80 hover:bg-purple/10 gap-1 cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span>Upload</span>
          </Button>
        }
      >
        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-xl bg-secondary/20 hover:bg-secondary/40 transition-colors cursor-pointer gap-2 text-center">
          <div className="size-10 rounded-full bg-purple/10 flex items-center justify-center text-purple">
            <UploadCloud className="size-5" />
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="font-montserrat text-[13px] text-muted-foreground">
              Drag & drop files here or <span className="font-semibold text-foreground underline">Browse File</span>
            </p>
            <p className="font-montserrat text-[11px] text-muted-foreground">
              Support: PDF, JPG, PNG
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

