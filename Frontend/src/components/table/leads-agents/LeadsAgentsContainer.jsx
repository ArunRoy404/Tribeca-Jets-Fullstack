"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Calendar, UserCheck, CheckCircle2, Trash2, Edit, RotateCcw } from "lucide-react";
import CommonCard from "@/components/common/CommonCard";
import Reveal from "@/components/common/Reveal";
import TablePagination from "@/components/table/common/TablePagination";
import TableStatus from "@/components/table/common/TableStatus";
import { useLeadsAgentsStore } from "@/store/useLeadsAgentsStore";

import LeadsToolbar from "./LeadsToolbar";
import LeadsCardsContainer from "./LeadsCardsContainer";
import LeadsTable from "./LeadsTable";
import AgentsToolbar from "./AgentsToolbar";
import AgentsCardsContainer from "./AgentsCardsContainer";
import AgentsTable from "./AgentsTable";

import AddLeadDialog from "@/components/leads-agents/AddLeadDialog";
import ScheduleFollowUpDialog from "@/components/leads-agents/ScheduleFollowUpDialog";
import AssignBrokerDialog from "@/components/leads-agents/AssignBrokerDialog";
import ConvertLeadDialog from "@/components/leads-agents/ConvertLeadDialog";
import ArchiveLeadDialog from "@/components/leads-agents/ArchiveLeadDialog";

import { useClients, useRestoreClient } from "@/hooks/clients";
import { useBrokerPerformance } from "@/hooks/clients";
import { useTripRequests } from "@/hooks/trip-requests";
import { useLeadsTableParams } from "@/hooks/leads";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission } from "@/lib/permissions";
import { ARCHIVE_TABS } from "@/lib/archive";
import { OPEN_LEAD_STAGES, toAgentRow, toLeadRow } from "@/lib/lead";
import { cn } from "@/lib/utils";

const MAIN_TABS = [
  { id: "leads", label: "Leads" },
  { id: "agents", label: "Agents" },
];

export default function LeadsAgentsContainer({ revealDelay = 0 }) {
  const router = useRouter();

  const activeMainTab = useLeadsAgentsStore((s) => s.activeMainTab);
  const setActiveMainTab = useLeadsAgentsStore((s) => s.setActiveMainTab);
  const openAddLeadModal = useLeadsAgentsStore((s) => s.openAddLeadModal);
  const openEditLeadModal = useLeadsAgentsStore((s) => s.openEditLeadModal);
  const openFollowUpModal = useLeadsAgentsStore((s) => s.openFollowUpModal);
  const openAssignBrokerModal = useLeadsAgentsStore((s) => s.openAssignBrokerModal);
  const openConvertLeadModal = useLeadsAgentsStore((s) => s.openConvertLeadModal);
  const openArchiveLeadModal = useLeadsAgentsStore((s) => s.openArchiveLeadModal);

  const { canWrite } = usePermissions();
  const mayWrite = canWrite(Permission.MANAGE_CLIENTS);

  // ---- Leads -------------------------------------------------------------
  // A lead is a Client at lead stage, so this is the clients endpoint with
  // `status: LEAD` pinned on. The tab is not a filter anyone can change to
  // something else, which is why it is applied here rather than in the URL.
  const params = useLeadsTableParams();
  const isArchived = params?.archived === true;
  const leadsQuery = useClients({ ...params?.queryParams, status: "LEAD" });

  // The enquiries behind the visible leads, fetched alongside so the Route and
  // value columns can show what each person actually asked for. One request
  // for the page rather than one per row.
  const clientIds = useMemo(
    () => (leadsQuery?.data?.data ?? []).map((c) => c?.id).filter(Boolean),
    [leadsQuery?.data?.data],
  );
  const requestsQuery = useTripRequests(
    { limit: 100, sortBy: "createdAt", sortOrder: "desc" },
    { enabled: clientIds.length > 0 },
  );

  /** The most recent enquiry per client, from the page just fetched. */
  const latestByClient = useMemo(() => {
    const map = new Map();
    for (const request of requestsQuery?.data?.data ?? []) {
      // Sorted newest-first by the API, so the first one wins.
      if (request?.clientId && !map.has(request.clientId)) {
        map.set(request.clientId, request);
      }
    }
    return map;
  }, [requestsQuery?.data?.data]);

  const leads = useMemo(
    () =>
      (leadsQuery?.data?.data ?? []).map((client) =>
        toLeadRow(client, latestByClient.get(client?.id) ?? null),
      ),
    [leadsQuery?.data?.data, latestByClient],
  );

  const meta = leadsQuery?.data?.meta;
  const pageCount = Math.max(meta?.totalPages ?? 1, 1);
  const leadsEmpty =
    !leadsQuery?.isPending && !leadsQuery?.error && leads.length === 0;

  const { mutate: restoreClient } = useRestoreClient();

  // ---- Agents ------------------------------------------------------------
  const agentsQuery = useBrokerPerformance();
  const [agentSearch, setAgentSearch] = useState("");
  const [agentRole, setAgentRole] = useState("");

  const agents = useMemo(() => {
    const rows = (agentsQuery?.data ?? []).map(toAgentRow);
    const term = agentSearch.trim().toLowerCase();
    return rows.filter((agent) => {
      if (agentRole && agent?.role !== agentRole) return false;
      if (!term) return true;
      return `${agent?.name} ${agent?.email}`.toLowerCase().includes(term);
    });
  }, [agentsQuery?.data, agentSearch, agentRole]);

  const agentsEmpty =
    !agentsQuery?.isPending && !agentsQuery?.error && agents.length === 0;

  // ---- Actions -----------------------------------------------------------
  const openLead = (id) => router?.push(`/dashboard/leads-agents/leads/${id}`);
  const openAgent = (id) => router?.push(`/dashboard/leads-agents/${id}`);

  const getLeadActions = (lead) => {
    const view = { label: "View Details", icon: <Eye />, onSelect: () => openLead(lead?.id) };
    if (!mayWrite) return [view];

    if (isArchived) {
      return [
        view,
        {
          label: "Restore Lead",
          icon: <RotateCcw />,
          onSelect: () => restoreClient?.({ id: lead?.id, name: lead?.name }),
        },
      ];
    }

    const actions = [
      view,
      { label: "Edit Lead", icon: <Edit />, onSelect: () => openEditLeadModal?.(lead) },
      { label: "Schedule Follow-up", icon: <Calendar />, onSelect: () => openFollowUpModal?.(lead) },
      { label: "Assign Broker", icon: <UserCheck />, onSelect: () => openAssignBrokerModal?.(lead) },
    ];

    // Converting a lead that is already Won or Lost is not a thing anyone
    // means to do, so the action is absent rather than disabled.
    if (OPEN_LEAD_STAGES.includes(lead?.rawStage)) {
      actions.push({
        label: "Convert to Client",
        icon: <CheckCircle2 />,
        onSelect: () => openConvertLeadModal?.(lead),
      });
    }

    actions.push("separator", {
      label: "Remove Lead",
      icon: <Trash2 />,
      variant: "destructive",
      onSelect: () => openArchiveLeadModal?.(lead),
    });
    return actions;
  };

  const getAgentActions = (agent) => [
    { label: "View Details", icon: <Eye />, onSelect: () => openAgent(agent?.id) },
  ];

  const isLeads = activeMainTab === "leads";

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        {/* Leads vs Agents — two different questions about the same desk, so
            they share a card rather than a filter. */}
        <div className="flex items-center gap-1 p-2 border-b border-border bg-white">
          {MAIN_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveMainTab?.(tab.id)}
              className={cn(
                "px-4 h-9 rounded-md font-montserrat text-[13px] font-semibold transition-colors",
                activeMainTab === tab.id
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isLeads ? (
          <>
            <LeadsToolbar
              search={params?.search}
              setSearch={params?.setSearch}
              stageFilter={params?.leadStage}
              setStageFilter={params?.setLeadStage}
              sourceFilter={params?.leadSource}
              setSourceFilter={params?.setLeadSource}
              priorityFilter={params?.priority}
              setPriorityFilter={params?.setPriority}
              brokerFilter={params?.assignedBrokerId}
              setBrokerFilter={params?.setAssignedBrokerId}
              limit={params?.limit}
              setLimit={params?.setLimit}
              onAddLead={openAddLeadModal}
              tab={isArchived ? ARCHIVE_TABS.ARCHIVED : ARCHIVE_TABS.LIVE}
              setTab={(tab) => params?.setArchived?.(tab === ARCHIVE_TABS.ARCHIVED)}
              mayWrite={mayWrite}
            />

            {leadsQuery?.isPending || leadsQuery?.error || leadsEmpty ? (
              <TableStatus
                isLoading={leadsQuery?.isPending}
                error={leadsQuery?.error}
                isEmpty={leadsEmpty}
                emptyMessage={isArchived ? "Nothing archived" : "No leads match these filters"}
                emptyHint={
                  isArchived
                    ? "Removed leads appear here and can be restored."
                    : params?.hasFilters
                      ? "Try clearing a filter."
                      : "Add the first lead to get started."
                }
                onRetry={leadsQuery?.refetch}
              />
            ) : (
              <>
                <div className="relative w-full lg:hidden">
                  <LeadsCardsContainer
                    leads={leads}
                    getRowActions={getLeadActions}
                    onSelectLead={openLead}
                    archived={isArchived}
                  />
                </div>
                <LeadsTable
                  pageItems={leads}
                  getRowActions={getLeadActions}
                  onSelectLead={openLead}
                  archived={isArchived}
                />
              </>
            )}

            {meta ? (
              <div className="relative w-full">
                <TablePagination
                  totalCount={meta?.total ?? 0}
                  itemLabel={isArchived ? "archived leads" : "leads"}
                  page={meta?.page ?? 1}
                  pageCount={pageCount}
                  onPrev={() => params?.goToPage?.((meta?.page ?? 1) - 1, pageCount)}
                  onNext={() => params?.goToPage?.((meta?.page ?? 1) + 1, pageCount)}
                  onPageChange={(next) => params?.goToPage?.(next, pageCount)}
                />
              </div>
            ) : null}
          </>
        ) : (
          <>
            <AgentsToolbar
              search={agentSearch}
              setSearch={setAgentSearch}
              roleFilter={agentRole}
              setRoleFilter={setAgentRole}
            />

            {agentsQuery?.isPending || agentsQuery?.error || agentsEmpty ? (
              <TableStatus
                isLoading={agentsQuery?.isPending}
                error={agentsQuery?.error}
                isEmpty={agentsEmpty}
                emptyMessage="No agents match these filters"
                emptyHint="Staff are invited in Users & Roles."
                onRetry={agentsQuery?.refetch}
              />
            ) : (
              <>
                <div className="relative w-full lg:hidden">
                  <AgentsCardsContainer
                    agents={agents}
                    getRowActions={getAgentActions}
                    onSelectAgent={openAgent}
                  />
                </div>
                <AgentsTable
                  pageItems={agents}
                  getRowActions={getAgentActions}
                  onSelectAgent={openAgent}
                />
              </>
            )}
          </>
        )}

        <AddLeadDialog />
        <ScheduleFollowUpDialog />
        <AssignBrokerDialog />
        <ConvertLeadDialog />
        <ArchiveLeadDialog />
      </CommonCard>
    </Reveal>
  );
}
