"use client";

import DetailHeader from "@/components/common/DetailHeader";
import AgentHeaderTitle from "./AgentHeaderTitle";
import AgentHeaderActions from "./AgentHeaderActions";

export default function AgentDetailHeader({
  agent,
  onEdit,
  onAssignLead,
}) {
  if (!agent) return null;

  return (
    <DetailHeader
      className="px-4 sm:px-6 py-4"
      backUrl="/dashboard/leads-agents"
      backLabel="Back to Agents"
      titleContent={<AgentHeaderTitle agent={agent} />}
      actions={
        <AgentHeaderActions
          onEdit={onEdit}
          onAssignLead={onAssignLead}
        />
      }
    />
  );
}
