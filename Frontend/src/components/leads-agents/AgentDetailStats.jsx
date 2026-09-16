"use client";

import StatCard from "@/components/common/StatCard";

export default function AgentDetailStats({ agent }) {
  // Use agent data with fallback hardcoded data for UI review matching Figma
  const activeLeads = agent?.activeLeads ?? 4;
  const qualifiedLeads = agent?.qualifiedLeads ?? 6;
  const converted = agent?.convertedLeads ?? 22;
  const activeTrips =
    agent?.activeTrips && agent.activeTrips !== "—" ? agent.activeTrips : 7;
  const followUpsDue = agent?.followUpsDue ?? 3;
  const conversionRate =
    agent?.conversionRate && agent.conversionRate !== "—"
      ? agent.conversionRate
      : "68%";

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 w-full">
      <StatCard
        title="Active Leads"
        value={String(activeLeads)}
      />
      <StatCard
        title="Qualified Leads"
        value={String(qualifiedLeads)}
      />
      <StatCard
        title="Converted"
        value={String(converted)}
      />
      <StatCard
        title="Active Trips"
        value={String(activeTrips)}
      />
      <StatCard
        title="Follow-ups Due"
        value={String(followUpsDue)}
      />
      <StatCard
        title="Conversion Rate"
        value={String(conversionRate)}
      />
    </div>
  );
}
