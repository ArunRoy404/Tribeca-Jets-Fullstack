"use client";

import { useRouter } from "next/navigation";
import { Eye, Calendar, UserCheck, CheckCircle2, Trash2, Edit, ShieldAlert } from "lucide-react";
import CommonCard from "@/components/common/CommonCard";
import Reveal from "@/components/common/Reveal";
import { useLeadsAgentsStore } from "@/store/useLeadsAgentsStore";
import TablePagination from "@/components/table/common/TablePagination";

import LeadsToolbar from "./LeadsToolbar";
import LeadsCardsContainer from "./LeadsCardsContainer";
import LeadsTable from "./LeadsTable";

import AgentsToolbar from "./AgentsToolbar";
import AgentsCardsContainer from "./AgentsCardsContainer";
import AgentsTable from "./AgentsTable";

import AddAgentDialog from "@/components/leads-agents/AddAgentDialog";
import AddLeadDialog from "@/components/leads-agents/AddLeadDialog";
import ScheduleFollowUpDialog from "@/components/leads-agents/ScheduleFollowUpDialog";
import AssignBrokerDialog from "@/components/leads-agents/AssignBrokerDialog";
import ConvertLeadDialog from "@/components/leads-agents/ConvertLeadDialog";
import DeleteLeadDialog from "@/components/leads-agents/DeleteLeadDialog";
import { cn } from "@/lib/utils";

export default function LeadsAgentsContainer({ revealDelay = 0 }) {
  const router = useRouter();

  const agents = useLeadsAgentsStore((s) => s.agents);
  const leads = useLeadsAgentsStore((s) => s.leads);
  const activeMainTab = useLeadsAgentsStore((s) => s.activeMainTab);
  const setActiveMainTab = useLeadsAgentsStore((s) => s.setActiveMainTab);

  // Agent State
  const search = useLeadsAgentsStore((s) => s.search);
  const setSearch = useLeadsAgentsStore((s) => s.setSearch);
  const statusFilter = useLeadsAgentsStore((s) => s.statusFilter);
  const setStatusFilter = useLeadsAgentsStore((s) => s.setStatusFilter);
  const page = useLeadsAgentsStore((s) => s.page);
  const nextPage = useLeadsAgentsStore((s) => s.nextPage);
  const prevPage = useLeadsAgentsStore((s) => s.prevPage);
  const selectAgent = useLeadsAgentsStore((s) => s.selectAgent);
  const openAddAgentModal = useLeadsAgentsStore((s) => s.openAddModal);
  const openEditAgentModal = useLeadsAgentsStore((s) => s.openEditModal);

  const getPageAgents = useLeadsAgentsStore((s) => s.getPageAgents);
  const getAgentsPageCount = useLeadsAgentsStore((s) => s.getAgentsPageCount);
  const getFilteredAgentsCount = useLeadsAgentsStore((s) => s.getFilteredAgentsCount);

  // Lead State
  const leadsSearch = useLeadsAgentsStore((s) => s.leadsSearch);
  const setLeadsSearch = useLeadsAgentsStore((s) => s.setLeadsSearch);
  const leadsStatusFilter = useLeadsAgentsStore((s) => s.leadsStatusFilter);
  const setLeadsStatusFilter = useLeadsAgentsStore((s) => s.setLeadsStatusFilter);
  const leadsSourceFilter = useLeadsAgentsStore((s) => s.leadsSourceFilter);
  const setLeadsSourceFilter = useLeadsAgentsStore((s) => s.setLeadsSourceFilter);
  const leadsBrokerFilter = useLeadsAgentsStore((s) => s.leadsBrokerFilter);
  const setLeadsBrokerFilter = useLeadsAgentsStore((s) => s.setLeadsBrokerFilter);
  const leadsPriorityFilter = useLeadsAgentsStore((s) => s.leadsPriorityFilter);
  const setLeadsPriorityFilter = useLeadsAgentsStore((s) => s.setLeadsPriorityFilter);

  const leadsPage = useLeadsAgentsStore((s) => s.leadsPage);
  const nextLeadsPage = useLeadsAgentsStore((s) => s.nextLeadsPage);
  const prevLeadsPage = useLeadsAgentsStore((s) => s.prevLeadsPage);
  const selectLead = useLeadsAgentsStore((s) => s.selectLead);

  const openAddLeadModal = useLeadsAgentsStore((s) => s.openAddLeadModal);
  const openScheduleFollowUpModal = useLeadsAgentsStore((s) => s.openScheduleFollowUpModal);
  const openAssignBrokerModal = useLeadsAgentsStore((s) => s.openAssignBrokerModal);
  const openConvertLeadModal = useLeadsAgentsStore((s) => s.openConvertLeadModal);
  const openDeleteLeadModal = useLeadsAgentsStore((s) => s.openDeleteLeadModal);

  const getPageLeads = useLeadsAgentsStore((s) => s.getPageLeads);
  const getLeadsPageCount = useLeadsAgentsStore((s) => s.getLeadsPageCount);
  const getFilteredLeadsCount = useLeadsAgentsStore((s) => s.getFilteredLeadsCount);

  const handleSelectLead = (id) => {
    selectLead?.(id);
    router?.push(`/dashboard/leads-agents/leads/${encodeURIComponent(id)}`);
  };

  const handleSelectAgent = (id) => {
    selectAgent?.(id);
    router?.push(`/dashboard/leads-agents/${encodeURIComponent(id)}`);
  };

  const getLeadRowActions = (item) => [
    {
      label: "View Details",
      icon: <Eye />,
      onSelect: () => handleSelectLead(item?.id),
    },
    {
      label: "Schedule Follow-up",
      icon: <Calendar />,
      onSelect: () => openScheduleFollowUpModal?.(item),
    },
    {
      label: "Assign Broker",
      icon: <UserCheck />,
      onSelect: () => openAssignBrokerModal?.(item),
    },
    {
      label: "Convert to Client",
      icon: <CheckCircle2 />,
      onSelect: () => openConvertLeadModal?.(item),
    },
    "separator",
    {
      label: "Delete Lead",
      icon: <Trash2 />,
      variant: "destructive",
      onSelect: () => openDeleteLeadModal?.(item),
    },
  ];

  const getAgentRowActions = (item) => [
    {
      label: "View Details",
      icon: <Eye />,
      onSelect: () => handleSelectAgent(item?.id),
    },
    {
      label: "Edit Agent",
      icon: <Edit />,
      onSelect: () => openEditAgentModal?.(item),
    },
    "separator",
    {
      label: "Deactivate",
      icon: <ShieldAlert />,
      variant: "destructive",
      onSelect: () => alert(`Deactivating agent ${item?.name}`),
    },
  ];

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        {/* Main Tab Header */}
        <div className="relative flex items-center gap-6 px-6 pt-4 border-b border-border w-full bg-white">
          <button
            type="button"
            onClick={() => setActiveMainTab?.("leads")}
            className={cn(
              "pb-3.5 font-montserrat font-bold text-[16px] transition-colors relative cursor-pointer",
              activeMainTab === "leads"
                ? "text-purple border-b-2 border-purple"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Leads ({leads?.length ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveMainTab?.("agents")}
            className={cn(
              "pb-3.5 font-montserrat font-bold text-[16px] transition-colors relative cursor-pointer",
              activeMainTab === "agents"
                ? "text-purple border-b-2 border-purple"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Agents ({agents?.length ?? 0})
          </button>
        </div>

        {activeMainTab === "leads" ? (
          <>
            <LeadsToolbar
              search={leadsSearch}
              setSearch={setLeadsSearch}
              statusFilter={leadsStatusFilter}
              setStatusFilter={setLeadsStatusFilter}
              sourceFilter={leadsSourceFilter}
              setSourceFilter={setLeadsSourceFilter}
              brokerFilter={leadsBrokerFilter}
              setBrokerFilter={setLeadsBrokerFilter}
              priorityFilter={leadsPriorityFilter}
              setPriorityFilter={setLeadsPriorityFilter}
              onAddLead={openAddLeadModal}
            />

            <div className="relative w-full lg:hidden p-3">
              <LeadsCardsContainer
                items={getPageLeads?.()}
                getRowActions={getLeadRowActions}
                onSelectLead={handleSelectLead}
              />
            </div>

            <LeadsTable
              pageItems={getPageLeads?.()}
              getRowActions={getLeadRowActions}
              onSelectLead={handleSelectLead}
            />

            <div className="relative w-full">
              <TablePagination
                totalCount={getFilteredLeadsCount?.()}
                itemLabel="leads"
                page={leadsPage}
                pageCount={getLeadsPageCount?.()}
                onPrev={prevLeadsPage}
                onNext={nextLeadsPage}
              />
            </div>
          </>
        ) : (
          <>
            <AgentsToolbar
              search={search}
              setSearch={setSearch}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              onAddAgent={openAddAgentModal}
            />

            <div className="relative w-full lg:hidden p-3">
              <AgentsCardsContainer
                items={getPageAgents?.()}
                getRowActions={getAgentRowActions}
                onSelectAgent={handleSelectAgent}
              />
            </div>

            <AgentsTable
              pageItems={getPageAgents?.()}
              getRowActions={getAgentRowActions}
              onSelectAgent={handleSelectAgent}
            />

            <div className="relative w-full">
              <TablePagination
                totalCount={getFilteredAgentsCount?.()}
                itemLabel="agents"
                page={page}
                pageCount={getAgentsPageCount?.()}
                onPrev={prevPage}
                onNext={nextPage}
              />
            </div>
          </>
        )}

        <AddAgentDialog />
        <AddLeadDialog />
        <ScheduleFollowUpDialog />
        <AssignBrokerDialog />
        <ConvertLeadDialog />
        <DeleteLeadDialog />
      </CommonCard>
    </Reveal>
  );
}
