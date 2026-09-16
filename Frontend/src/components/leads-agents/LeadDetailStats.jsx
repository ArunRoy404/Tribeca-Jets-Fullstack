"use client";

import SimpleStatsRow from "@/components/common/SimpleStatsRow";

/**
 * Every value comes from the record. The mapper already renders anything
 * missing as an em dash, so there are no `||` fallbacks here — the previous
 * ones ("Proposal", "Barry", "Direct", "High", "$28,000") meant every lead
 * displayed the same figures whether or not anyone had entered them.
 */
export default function LeadDetailStats({ lead }) {
  if (!lead) return null;

  const stats = [
    { label: "Stage", value: lead.stage || "—", tone: "foreground" },
    { label: "Priority", value: lead.priority || "—", tone: "foreground" },
    { label: "Source", value: lead.source || "—", tone: "foreground" },
    { label: "Broker", value: lead.brokerName, tone: "purple" },
    { label: "Next Follow-up", value: lead.nextFollowUp, tone: "warning" },
    // From the newest enquiry, or an em dash when none has been filed.
    { label: "Est. Trip Value", value: lead.estimatedValue, tone: "success" },
  ];

  return <SimpleStatsRow stats={stats} />;
}
