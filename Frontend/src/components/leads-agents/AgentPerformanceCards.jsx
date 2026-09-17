"use client";

import DetailCard from "@/components/common/DetailCard";
import StatusBadge from "@/components/common/StatusBadge";
import { formatUserRole } from "@/lib/user";

/**
 * AgentPerformanceCards
 *
 * API Integration Guidelines:
 * - Data source: `agent` row mapped from `GET /api/clients/broker-performance`
 * - Performance Summary fields:
 *   - Total Leads Converted: agent.convertedLeads
 *   - Conversion Rate: agent.conversionRate
 *   - Active Pipeline: agent.activeLeads
 *   - Max Lead Capacity: agent.maxActiveLeads (from User.maxActiveLeads configuration)
 * - Contact Information fields:
 *   - Email: agent.email
 *   - Phone: agent.phone
 *   - Role: UserRole enum mapped via formatUserRole
 *   - Status: UserStatus enum ("ACTIVE", "SUSPENDED", "INVITED")
 *
 * Missing or unconfigured fields render honest em dashes ("—").
 */
export default function AgentPerformanceCards({ agent }) {
  const converted =
    agent?.convertedLeads !== null && agent?.convertedLeads !== undefined
      ? String(agent.convertedLeads)
      : "—";
  const conversionRate =
    agent?.conversionRate && agent.conversionRate !== "—"
      ? agent.conversionRate
      : "—";
  const pipeline =
    agent?.activeLeads !== null && agent?.activeLeads !== undefined
      ? String(agent.activeLeads)
      : "—";
  const capacity =
    agent?.maxActiveLeads && agent.maxActiveLeads !== "—"
      ? String(agent.maxActiveLeads)
      : "—";

  const email = agent?.email && agent.email !== "—" ? agent.email : "—";
  const phone = agent?.phone && agent.phone !== "—" ? agent.phone : "—";
  const role = agent?.role ? formatUserRole(agent.role) : "—";
  const status = agent?.status || null;

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
            {status ? <StatusBadge status={status} bordered /> : <span>—</span>}
          </div>
        </div>
      </DetailCard>
    </div>
  );
}
