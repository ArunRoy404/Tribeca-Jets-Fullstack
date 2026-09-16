"use client";

import SectionCard from "@/components/common/SectionCard";
import DetailField from "@/components/common/DetailField";

export default function LeadSidebarCards({ lead }) {
  if (!lead) return null;

  return (
    <div className="flex flex-col gap-6 w-full">
      <SectionCard title="ASSIGNED BROKER">
        <p className="font-montserrat font-bold text-[15px] text-purple">
          {lead.brokerName}
        </p>
      </SectionCard>

      <SectionCard title="NEXT FOLLOW-UP">
        <div className="flex flex-col gap-3 w-full">
          <DetailField label="Date" value={lead.nextFollowUp} />
          <DetailField label="Method" value={lead.followUpMethod || "—"} />
          {lead.followUpNote ? (
            <p className="font-montserrat text-[12px] text-foreground leading-relaxed">
              {lead.followUpNote}
            </p>
          ) : null}
        </div>
      </SectionCard>
    </div>
  );
}
