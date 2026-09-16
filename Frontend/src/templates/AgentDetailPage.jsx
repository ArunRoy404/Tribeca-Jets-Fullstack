"use client";

import { use, useMemo } from "react";
import AgentDetailHeader from "@/components/leads-agents/AgentDetailHeader";
import AgentDetailStats from "@/components/leads-agents/AgentDetailStats";
import AgentAssignedLeadsTable from "@/components/leads-agents/AgentAssignedLeadsTable";
import AgentAssignedLeadCardsContainer from "@/components/leads-agents/AgentAssignedLeadCardsContainer";
import AgentAssociatedTrips from "@/components/leads-agents/AgentAssociatedTrips";
import Reveal from "@/components/common/Reveal";
import NotFoundState from "@/components/common/NotFoundState";
import TableStatus from "@/components/table/common/TableStatus";
import { useBrokerPerformance, useClients } from "@/hooks/clients";
import { toAgentRow, toLeadRow } from "@/lib/lead";

/**
 * One broker, with the leads assigned to them.
 *
 * The roster is a view over Users, so this page reads the same
 * broker-performance response and picks its row out — there is no agents
 * table to fetch from.
 */
export default function AgentDetailPage({ params }) {
  const unwrappedParams = use(params);
  const rawId = decodeURIComponent(unwrappedParams?.agentId || "");

  const { data, isPending, error, refetch } = useBrokerPerformance();
  const { data: leadsData } = useClients(
    { status: "LEAD", assignedBrokerId: rawId, limit: 50 },
    { enabled: Boolean(rawId) },
  );

  const agent = useMemo(() => {
    const row = (data ?? []).find((a) => a?.id === rawId);
    return row ? toAgentRow(row) : null;
  }, [data, rawId]);

  const leads = useMemo(
    () => (leadsData?.data ?? []).map((client) => toLeadRow(client)),
    [leadsData?.data],
  );

  if (isPending || error) {
    return (
      <div className="p-4 sm:p-6">
        <TableStatus isLoading={isPending} error={error} onRetry={refetch} />
      </div>
    );
  }

  if (!agent) {
    return (
      <NotFoundState
        itemType="Agent"
        backUrl="/dashboard/leads-agents"
        backLabel="Back to Agents"
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 pb-12 w-full max-w-7xl mx-auto">
      <Reveal>
        <AgentDetailHeader agent={agent} />
      </Reveal>

      <Reveal>
        <AgentDetailStats agent={agent} />
      </Reveal>

      <Reveal className="w-full">
        <div className="relative w-full lg:hidden">
          <AgentAssignedLeadCardsContainer leads={leads} />
        </div>
        <AgentAssignedLeadsTable leads={leads} />
      </Reveal>

      <Reveal className="w-full">
        <AgentAssociatedTrips />
      </Reveal>
    </div>
  );
}
