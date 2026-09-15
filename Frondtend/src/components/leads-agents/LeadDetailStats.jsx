"use client";

import SimpleStatsRow from "@/components/common/SimpleStatsRow";

export default function LeadDetailStats({ lead }) {
  if (!lead) return null;

  const stats = [
    { label: "Lead Status", value: lead.status || "Proposal", tone: "foreground" },
    { label: "Assigned Broker", value: lead.broker || "Barry", tone: "foreground" },
    { label: "Source", value: lead.source || "Direct", tone: "foreground" },
    { label: "Priority", value: lead.priority || "High", tone: "foreground" },
    { label: "Next Follow-up", value: lead.nextFollowUp || "Aug 12, 2026", tone: "foreground" },
    { label: "Est. Trip Value", value: lead.estValue || "$28,000", tone: "foreground" },
  ];

  return <SimpleStatsRow stats={stats} />;
}

