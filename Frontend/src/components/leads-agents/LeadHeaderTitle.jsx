"use client";

import StatusBadge from "@/components/common/StatusBadge";

/**
 * LeadHeaderTitle
 *
 * API Integration Guidelines:
 * - Data source: `lead` row mapped via `toLeadRow(client, latestTripRequest)` in `@/lib/lead.js`
 * - Fields:
 *   - name: string (Client firstName + lastName or companyName)
 *   - stage: LeadStage enum mapped to display string (e.g. "New", "Contacted", "Qualified", "Proposal")
 *   - priority: ClientPriority enum mapped to display string ("High", "Medium", "Low")
 *   - company: string or "—"
 *   - route: string from latest trip request (e.g. "KTEB → KMIA") or "—"
 *   - brokerName: string from Client.assignedBroker or "Unassigned"
 *   - email: string
 *   - phone: string
 *
 * Missing values render honest em dashes per project agreement.
 */
export default function LeadHeaderTitle({ lead }) {
  if (!lead) return null;

  const displayName = lead.name || "—";
  const displayStage = lead.stage && lead.stage !== "—" ? lead.stage : null;
  const displayPriority = lead.priority && lead.priority !== "—" ? lead.priority : null;
  const displayCompany = lead.company && lead.company !== "—" ? lead.company : null;
  const displayRoute = lead.route && lead.route !== "—" ? lead.route : null;
  const displayBroker = lead.brokerName && lead.brokerName !== "—" ? lead.brokerName : null;
  const displayEmail = lead.email && lead.email !== "—" ? lead.email : null;
  const displayPhone = lead.phone && lead.phone !== "—" ? lead.phone : null;

  const metaParts = [
    displayCompany,
    displayRoute,
    displayBroker ? `Broker: ${displayBroker}` : null,
    displayEmail,
    displayPhone,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-2.5 flex-wrap">
        <h1 className="font-montserrat font-bold text-[18px] sm:text-[22px] text-foreground leading-tight">
          {displayName}
        </h1>
        {displayStage ? <StatusBadge status={displayStage} bordered /> : null}
        {displayPriority ? <StatusBadge status={displayPriority} bordered /> : null}
      </div>

      {metaParts.length > 0 ? (
        <p className="font-montserrat text-[12px] sm:text-[13px] text-muted-foreground flex items-center gap-2 flex-wrap">
          {metaParts.join(" • ")}
        </p>
      ) : (
        <p className="font-montserrat text-[12px] sm:text-[13px] text-muted-foreground">
          No contact details on file
        </p>
      )}
    </div>
  );
}
