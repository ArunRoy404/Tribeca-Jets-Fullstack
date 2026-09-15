"use client";

import SimpleStatsRow from "@/components/common/SimpleStatsRow";

export default function AgentDetailStats({ agent }) {
  if (!agent) return null;

  const stats = [
    { label: "Active Leads", value: String(agent.activeLeads ?? 4), tone: "foreground" },
    { label: "Qualified Leads", value: String(agent.qualifiedLeads ?? 6), tone: "foreground" },
    { label: "Converted", value: String(agent.convertedLeads ?? 22), tone: "foreground" },
    { label: "Active Trips", value: String(agent.activeTrips ?? 7), tone: "foreground" },
    { label: "Follow-ups Due", value: String(agent.followUpsDue ?? 3), tone: "foreground" },
    { label: "Conversion Rate", value: agent.conversionRate ?? "68%", tone: "foreground" },
  ];

  return <SimpleStatsRow stats={stats} />;
}

