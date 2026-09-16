"use client";

import { useMemo } from "react";
import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import { useClientStats, useBrokerPerformance } from "@/hooks/clients";
import { useTripRequestStats } from "@/hooks/trip-requests";
import { formatMoney } from "@/lib/lead";

/**
 * The tiles above the Leads & Agents screens.
 *
 * Every figure comes from the API — an em dash while it loads, never a
 * placeholder. These were hardcoded to 12 / 3 / 10 / 8% / 4 regardless of what
 * the desk actually held.
 *
 * "Conversion Rate" is deliberately absent: it is a per-broker number on the
 * Agents roster, and a single desk-wide percentage over a handful of leads
 * says less than it appears to.
 */
export default function LeadsAgentsStats() {
  const { data: clients, isPending: clientsPending } = useClientStats();
  const { data: requests, isPending: requestsPending } = useTripRequestStats();
  const { data: agents, isPending: agentsPending } = useBrokerPerformance();

  const stats = useMemo(() => {
    const show = (pending, value) => (pending ? "—" : String(value ?? 0));

    return [
      {
        label: "Total Leads",
        value: show(clientsPending, clients?.leads),
        meta: "at lead stage",
        tone: "foreground",
      },
      {
        label: "Open Requests",
        value: show(requestsPending, requests?.open),
        meta: "awaiting sourcing",
        tone: "warning",
      },
      {
        label: "Follow-ups Due",
        value: show(clientsPending, clients?.followUpsDue),
        meta: "overdue or today",
        tone: "destructive",
      },
      {
        label: "Pipeline Value",
        value: requestsPending ? "—" : formatMoney(requests?.pipelineValue),
        meta: "open requests",
        tone: "success",
      },
      {
        label: "Active Agents",
        value: show(agentsPending, agents?.length),
        meta: "on the desk",
        tone: "info",
      },
    ];
  }, [clients, clientsPending, requests, requestsPending, agents, agentsPending]);

  return <SimpleStatsRow stats={stats} />;
}
