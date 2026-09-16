"use client";

import DetailCard from "@/components/common/DetailCard";
import StatusBadge from "@/components/common/StatusBadge";
import { formatUserRole } from "@/lib/user";

export default function AgentPerformanceCards({ agent }) {
  const converted = agent?.convertedLeads ?? 22;
  const conversionRate =
    agent?.conversionRate && agent.conversionRate !== "—"
      ? agent.conversionRate
      : "68%";
  const pipeline = agent?.activeLeads ?? 4;
  const capacity =
    agent?.maxActiveLeads && agent.maxActiveLeads !== "—"
      ? agent.maxActiveLeads
      : 15;

  const email =
    agent?.email && agent.email !== "—"
      ? agent.email
      : "barry@tribecajets.com";
  const phone =
    agent?.phone && agent.phone !== "—"
      ? agent.phone
      : "+1 (212) 555-0201";
  const role = agent?.role ? formatUserRole(agent.role) : "Senior Broker";
  const status = agent?.status || "ACTIVE";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full">
      {/* Performance Summary Card */}
      <DetailCard title="Performance Summary">
        <div className="flex flex-col divide-y divide-border/60 text-[12px] sm:text-[13px] font-montserrat">
          <div className="flex items-center justify-between py-2.5 first:pt-0">
            <span className="text-muted-foreground">Total Leads Converted</span>
            <span className="font-bold text-foreground">{converted}</span>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <span className="text-muted-foreground">Conversion Rate</span>
            <span className="font-bold text-foreground">{conversionRate}</span>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <span className="text-muted-foreground">Active Pipeline</span>
            <span className="font-bold text-foreground">{pipeline}</span>
          </div>
          <div className="flex items-center justify-between py-2.5 last:pb-0">
            <span className="text-muted-foreground">Max Lead Capacity</span>
            <span className="font-bold text-foreground">{capacity}</span>
          </div>
        </div>
      </DetailCard>

      {/* Contact Information Card */}
      <DetailCard title="Contact Information">
        <div className="flex flex-col divide-y divide-border/60 text-[12px] sm:text-[13px] font-montserrat">
          <div className="flex items-center justify-between py-2.5 first:pt-0">
            <span className="text-muted-foreground">Email</span>
            <span className="font-bold text-foreground truncate max-w-[200px] sm:max-w-none">{email}</span>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <span className="text-muted-foreground">Phone</span>
            <span className="font-bold text-foreground">{phone}</span>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <span className="text-muted-foreground">Role</span>
            <span className="font-bold text-foreground">{role}</span>
          </div>
          <div className="flex items-center justify-between py-2.5 last:pb-0">
            <span className="text-muted-foreground">Status</span>
            <StatusBadge status={status} bordered />
          </div>
        </div>
      </DetailCard>
    </div>
  );
}
