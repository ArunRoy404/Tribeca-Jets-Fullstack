"use client";

import { use, useMemo, useState } from "react";
import CommonCard from "@/components/common/CommonCard";
import AgentDetailHeader from "@/components/leads-agents/AgentDetailHeader";
import AgentDetailStats from "@/components/leads-agents/AgentDetailStats";
import AgentPerformanceCards from "@/components/leads-agents/AgentPerformanceCards";
import AgentAssignedLeadsTable from "@/components/leads-agents/AgentAssignedLeadsTable";
import AgentAssociatedTrips from "@/components/leads-agents/AgentAssociatedTrips";
import AgentRecentActivity from "@/components/leads-agents/AgentRecentActivity";
import AssignBrokerDialog from "@/components/leads-agents/AssignBrokerDialog";
import ScheduleFollowUpDialog from "@/components/leads-agents/ScheduleFollowUpDialog";
import ConvertLeadDialog from "@/components/leads-agents/ConvertLeadDialog";
import NotFoundState from "@/components/common/NotFoundState";
import TableStatus from "@/components/table/common/TableStatus";
import { useBrokerPerformance, useClients } from "@/hooks/clients";
import { useLeadsAgentsStore } from "@/store/useLeadsAgentsStore";
import { toAgentRow, toLeadRow } from "@/lib/lead";
import { useRouter } from "next/navigation";

/**
 * AgentDetailPage
 *
 * One broker/agent, with the leads assigned to them.
 *
 * Data binding:
 * - Agent performance: reads from `useBrokerPerformance()` and finds the row matching `agentId`.
 * - Assigned leads: queries `useClients({ status: "LEAD", assignedBrokerId: agentId, page, limit: 10 })`,
 *   paged by the table's own Prev/Next.
 *
 * Future API connections:
 * - Associated trips: GET /api/trips?brokerId={agentId}
 * - Recent activity: GET /api/audit-logs?userId={agentId}
 */
export default function AgentDetailPage({ params }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const rawId = decodeURIComponent(unwrappedParams?.agentId || "");

  const openAssignBrokerModal = useLeadsAgentsStore((s) => s.openAssignBrokerModal);
  const openFollowUpModal = useLeadsAgentsStore((s) => s.openFollowUpModal);
  const openConvertLeadModal = useLeadsAgentsStore((s) => s.openConvertLeadModal);

  // Local, not in the URL: this is one section of a detail page rather than a
  // table screen, and the page's own address already identifies the agent.
  const [leadsPage, setLeadsPage] = useState(1);

  const { data, isPending, error, refetch } = useBrokerPerformance();
  const { data: leadsData } = useClients(
    { status: "LEAD", assignedBrokerId: rawId, page: leadsPage, limit: 10 },
    { enabled: Boolean(rawId) },
  );

  const agent = useMemo(() => {
    const row = (data ?? []).find((a) => a?.id === rawId);
    return row ? toAgentRow(row) : null;
  }, [data, rawId]);

  const leads = useMemo(() => {
    const rows = leadsData?.data ?? [];
    return rows.map((client) => toLeadRow(client));
  }, [leadsData?.data]);

  if (isPending && !data) {
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
    <div className="flex flex-col w-full bg-page-bg min-h-screen">
      {/* Top Header */}
      <AgentDetailHeader
        agent={agent}
        onEdit={() => router.push("/dashboard/users-roles")}
        onAssignLead={() => openAssignBrokerModal(null)}
      />

      {/* 6 Stats KPI Row */}
      <div className="px-4 md:px-6 pt-4 sm:pt-6">
        <AgentDetailStats agent={agent} />
      </div>

      {/* Main Details Wrapper using CommonCard */}
      <CommonCard className="m-4 md:m-6 border border-border overflow-hidden bg-white">
        {/* Tab Navigation / Header */}
        <div className="flex items-center px-4 sm:px-6 border-b border-border bg-white">
          <div className="py-3 px-1 border-b-2 border-purple text-purple font-montserrat font-semibold text-[13px] sm:text-[14px]">
            Overview of {agent.name}
          </div>
        </div>

        {/* Interior Container with light background */}
        <div className="p-4 sm:p-6 flex flex-col gap-6 bg-secondary/15">
          {/* Section 1: Overview */}
          <div className="flex flex-col gap-3 w-full">
            <h2 className="font-montserrat font-bold text-[14px] text-foreground">
              Overview
            </h2>
            <AgentPerformanceCards agent={agent} />
          </div>

          {/* Section 2: Assigned Leads */}
          <div className="w-full">
            <AgentAssignedLeadsTable
              leads={leads}
              meta={leadsData?.meta}
              agentName={agent.name}
              onSelectLead={(leadId) => router.push(`/dashboard/leads-agents/leads/${leadId}`)}
              onScheduleFollowUp={(lead) => openFollowUpModal(lead)}
              onConvertLead={(lead) => openConvertLeadModal(lead)}
              onPageChange={setLeadsPage}
            />
          </div>

          {/* Section 3: Bottom 2-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start w-full">
            <AgentAssociatedTrips />
            <AgentRecentActivity />
          </div>
        </div>
      </CommonCard>

      {/* Dialogs — mounted here because the assigned-leads table offers the
          actions they perform. Without them the row menu had two items that
          did nothing. */}
      <AssignBrokerDialog />
      <ScheduleFollowUpDialog />
      <ConvertLeadDialog />
    </div>
  );
}
