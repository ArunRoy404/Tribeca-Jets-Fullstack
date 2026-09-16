"use client";

import DetailHeader from "@/components/common/DetailHeader";
import LeadHeaderTitle from "./LeadHeaderTitle";
import LeadHeaderActions from "./LeadHeaderActions";

export default function LeadDetailHeader({
  lead,
  onEdit,
  onFollowUp,
  onConvert,
  onAssignBroker,
  onArchive,
}) {
  if (!lead) return null;

  return (
    <DetailHeader
      className="px-4 sm:px-6 py-4"
      backUrl="/dashboard/leads-agents"
      backLabel="Back to Leads"
      titleContent={<LeadHeaderTitle lead={lead} />}
      actions={
        <LeadHeaderActions
          onEdit={onEdit}
          onFollowUp={onFollowUp}
          onConvert={onConvert}
          onAssignBroker={onAssignBroker}
          onArchive={onArchive}
        />
      }
    />
  );
}
