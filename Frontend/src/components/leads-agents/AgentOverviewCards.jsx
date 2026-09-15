"use client";

import SectionCard from "@/components/common/SectionCard";
import DetailField from "@/components/common/DetailField";
import StatusBadge from "@/components/common/StatusBadge";

export default function AgentOverviewCards({ agent }) {
  if (!agent) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
      {/* Card 1: Performance Summary */}
      <SectionCard title="Performance Summary" className="bg-white">
        <div className="grid grid-cols-2 gap-4 w-full">
          <DetailField
            label="Total Leads Converted"
            value={agent.convertedLeads ?? 22}
          />
          <DetailField
            label="Conversion Rate"
            value={agent.conversionRate ?? "68%"}
          />
          <DetailField
            label="Active Pipeline"
            value={agent.activePipeline ?? 4}
          />
          <DetailField
            label="Max Lead Capacity"
            value={agent.maxLeadCapacity ?? 15}
          />
        </div>
      </SectionCard>

      {/* Card 2: Contact Information */}
      <SectionCard title="Contact Information" className="bg-white">
        <div className="grid grid-cols-2 gap-4 w-full">
          <DetailField
            label="Email"
            value={agent.email}
            valueClassName="truncate"
          />
          <DetailField
            label="Phone"
            value={agent.phone}
          />
          <DetailField
            label="Role"
            value={agent.role || "Broker"}
          />
          <div className="flex flex-1 min-w-0 flex-col gap-2 items-start border-b border-secondary pb-2">
            <p className="font-montserrat font-normal text-[12px] text-muted-foreground">Status</p>
            <StatusBadge status={agent.status} bordered />
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

