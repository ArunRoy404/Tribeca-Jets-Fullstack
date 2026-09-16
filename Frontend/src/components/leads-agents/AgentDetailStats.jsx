"use client";

import SimpleStatsRow from "@/components/common/SimpleStatsRow";

/**
 * Every figure comes from the API. `conversionRate`, `capacityUsed` and
 * `activeTrips` read as an em dash when there is nothing to measure — a broker
 * with no leads yet, no capacity set, or the Trips module not built. Never 0%,
 * which would follow a new broker around as a wrong answer.
 */
export default function AgentDetailStats({ agent }) {
  if (!agent) return null;

  const stats = [
    { label: "Active Leads", value: String(agent.activeLeads), tone: "foreground" },
    { label: "Converted", value: String(agent.convertedLeads), tone: "success" },
    { label: "Conversion", value: agent.conversionRate, tone: "info" },
    { label: "Follow-ups Due", value: String(agent.followUpsDue), tone: "destructive" },
    { label: "Capacity Used", value: agent.capacityUsed, tone: "warning" },
    { label: "Active Trips", value: agent.activeTrips, tone: "purple" },
  ];

  return <SimpleStatsRow stats={stats} />;
}
