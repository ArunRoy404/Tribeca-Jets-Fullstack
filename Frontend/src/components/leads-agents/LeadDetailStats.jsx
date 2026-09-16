"use client";

import StatCard from "@/components/common/StatCard";

/**
 * LeadDetailStats
 *
 * API Integration Guidelines:
 * - Data source: `lead` row mapped from `GET /api/clients/{id}` paired with `GET /api/trip-requests?clientId={id}`
 * - Metrics:
 *   - Lead Status: lead.stage (LeadStage enum)
 *   - Assigned Broker: lead.brokerName (User full name)
 *   - Lead Source: lead.source (LeadSource enum)
 *   - Client Type: lead.type (ClientType enum: "DIRECT", "CORPORATE", "BROKER", "TRAVEL_AGENT")
 *   - Next Follow-up: lead.nextFollowUp (formatted from Client.nextFollowUpAt)
 *   - Est. Trip Value: lead.estimatedValue (from latest TripRequest.estimatedValue)
 *
 * Never displays a number the data did not supply — missing values render honest em dashes ("—").
 */
export default function LeadDetailStats({ lead }) {
  const stage = lead?.stage && lead.stage !== "—" ? lead.stage : "—";
  const broker = lead?.brokerName && lead.brokerName !== "—" ? lead.brokerName : "Unassigned";
  const source = lead?.source && lead.source !== "—" ? lead.source : "—";
  const clientType = lead?.type && lead.type !== "—" ? lead.type : "—";
  const nextFollowUp = lead?.nextFollowUp && lead.nextFollowUp !== "—" ? lead.nextFollowUp : "—";
  const estValue = lead?.estimatedValue && lead.estimatedValue !== "—" ? lead.estimatedValue : "—";

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 w-full">
      <StatCard
        title="Lead Status"
        value={stage}
        badgeText={stage !== "—" ? stage : null}
        tone="info"
      />
      <StatCard
        title="Assigned Broker"
        value={broker}
        valueTone="purple"
      />
      <StatCard
        title="Lead Source"
        value={source}
      />
      <StatCard
        title="Client Type"
        value={clientType}
      />
      <StatCard
        title="Next Follow-up"
        value={nextFollowUp}
        valueTone="warning"
      />
      <StatCard
        title="Est. Trip Value"
        value={estValue}
        valueTone="success"
      />
    </div>
  );
}
