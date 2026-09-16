"use client";

import StatCard from "@/components/common/StatCard";

/**
 * AgentDetailStats
 *
 * API Integration Guidelines:
 * - Data source: `agent` row mapped from `GET /api/clients/broker-performance`
 * - Metrics:
 *   - Active Leads: agent.activeLeads (number of active leads assigned to broker)
 *   - Qualified Leads: awaiting lead qualification status aggregation (GET /api/clients?assignedBrokerId={id}&leadStage=QUALIFIED)
 *   - Converted: agent.convertedLeads (leads converted to clients / won)
 *   - Active Trips: agent.activeTrips (awaiting Trips module: GET /api/trips?brokerId={id}&status=ACTIVE)
 *   - Follow-ups Due: agent.followUpsDue (leads with nextFollowUpAt <= now)
 *   - Conversion Rate: agent.conversionRate (converted / total leads percentage)
 *
 * Missing or unbuilt module metrics render honest em dashes ("—").
 */
export default function AgentDetailStats({ agent }) {
  const activeLeads =
    agent?.activeLeads !== null && agent?.activeLeads !== undefined
      ? String(agent.activeLeads)
      : "0";
  const qualifiedLeads =
    agent?.qualifiedLeads !== null && agent?.qualifiedLeads !== undefined
      ? String(agent.qualifiedLeads)
      : "—";
  const converted =
    agent?.convertedLeads !== null && agent?.convertedLeads !== undefined
      ? String(agent.convertedLeads)
      : "0";
  const activeTrips =
    agent?.activeTrips && agent.activeTrips !== "—"
      ? String(agent.activeTrips)
      : "—";
  const followUpsDue =
    agent?.followUpsDue !== null && agent?.followUpsDue !== undefined
      ? String(agent.followUpsDue)
      : "0";
  const conversionRate =
    agent?.conversionRate && agent.conversionRate !== "—"
      ? String(agent.conversionRate)
      : "—";

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 w-full">
      <StatCard
        title="Active Leads"
        value={activeLeads}
      />
      <StatCard
        title="Qualified Leads"
        value={qualifiedLeads}
      />
      <StatCard
        title="Converted"
        value={converted}
        valueTone="success"
      />
      <StatCard
        title="Active Trips"
        value={activeTrips}
        valueTone="purple"
      />
      <StatCard
        title="Follow-ups Due"
        value={followUpsDue}
        valueTone="destructive"
      />
      <StatCard
        title="Conversion Rate"
        value={conversionRate}
        valueTone="info"
      />
    </div>
  );
}
