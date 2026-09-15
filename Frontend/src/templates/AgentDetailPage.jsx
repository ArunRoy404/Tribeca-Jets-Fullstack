"use client";

import { use } from "react";
import AgentDetailHeader from "@/components/leads-agents/AgentDetailHeader";
import AgentDetailStats from "@/components/leads-agents/AgentDetailStats";
import AgentOverviewCards from "@/components/leads-agents/AgentOverviewCards";
import AgentAssignedLeadsTable from "@/components/leads-agents/AgentAssignedLeadsTable";
import AgentAssociatedTrips from "@/components/leads-agents/AgentAssociatedTrips";
import AgentRecentActivity from "@/components/leads-agents/AgentRecentActivity";
import AddAgentDialog from "@/components/leads-agents/AddAgentDialog";
import Reveal from "@/components/common/Reveal";
import NotFoundState from "@/components/common/NotFoundState";
import { useLeadsAgentsStore } from "@/store/useLeadsAgentsStore";

export default function AgentDetailPage({ params }) {
  const unwrappedParams = use(params);
  const rawId = decodeURIComponent(unwrappedParams?.agentId || "");

  const getAgentById = useLeadsAgentsStore((s) => s.getAgentById);
  const assignedLeads = useLeadsAgentsStore((s) => s.assignedLeads);
  const associatedTrips = useLeadsAgentsStore((s) => s.associatedTrips);
  const recentActivities = useLeadsAgentsStore((s) => s.recentActivities);
  const openEditModal = useLeadsAgentsStore((s) => s.openEditModal);

  const agent = getAgentById(rawId);

  if (!agent) {
    return <NotFoundState itemType="Agent" backUrl="/dashboard/leads-agents" backLabel="Back to Agents" />;
  }

  // Leads, trips, activities associated with this agent
  const agentLeads = assignedLeads?.filter(
    (l) => l?.agentId === agent?.id || l?.agentId === "AGT-101"
  );
  const agentTrips = associatedTrips?.filter(
    (t) => t?.agentId === agent?.id || t?.agentId === "AGT-101"
  );
  const agentActivities = recentActivities?.filter(
    (a) => a?.agentId === agent?.id || a?.agentId === "AGT-101"
  );

  return (
    <>
      <div className="flex flex-col gap-6 p-4 sm:p-6 pb-12 w-full max-w-7xl mx-auto">
        <Reveal>
          <AgentDetailHeader
            agent={agent}
            onEdit={() => openEditModal(agent)}
            onAssignLead={() => alert(`Assign new lead to ${agent?.name}`)}
          />
        </Reveal>

        {/* 6 Metric KPI Stats */}
        <Reveal>
          <AgentDetailStats agent={agent} />
        </Reveal>

        {/* Main Details Panel matching Figma */}
        <div className="flex flex-col gap-6 w-full rounded-lg border border-border bg-white/80 backdrop-blur-md p-4 sm:p-6 shadow-card">
          {/* Header Tab Title */}
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <h2 className="font-montserrat font-bold text-[16px] text-purple">
              Overview of {agent?.name}
            </h2>
          </div>

          {/* Performance Summary + Contact Information */}
          <Reveal>
            <AgentOverviewCards agent={agent} />
          </Reveal>

          {/* Assigned Leads Table */}
          <Reveal>
            <AgentAssignedLeadsTable agent={agent} leads={agentLeads} />
          </Reveal>

          {/* Bottom Split: Associated Trips & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full items-start">
            <Reveal className="w-full">
              <AgentAssociatedTrips trips={agentTrips} />
            </Reveal>
            <Reveal className="w-full">
              <AgentRecentActivity activities={agentActivities} />
            </Reveal>
          </div>
        </div>
      </div>

      <AddAgentDialog />
    </>
  );
}
