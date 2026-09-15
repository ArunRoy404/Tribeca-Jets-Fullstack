"use client";

import { use } from "react";
import LeadDetailHeader from "@/components/leads-agents/LeadDetailHeader";
import LeadDetailStats from "@/components/leads-agents/LeadDetailStats";
import LeadOverviewCards from "@/components/leads-agents/LeadOverviewCards";
import LeadSidebarCards from "@/components/leads-agents/LeadSidebarCards";
import ScheduleFollowUpDialog from "@/components/leads-agents/ScheduleFollowUpDialog";
import AssignBrokerDialog from "@/components/leads-agents/AssignBrokerDialog";
import ConvertLeadDialog from "@/components/leads-agents/ConvertLeadDialog";
import DeleteLeadDialog from "@/components/leads-agents/DeleteLeadDialog";
import Reveal from "@/components/common/Reveal";
import NotFoundState from "@/components/common/NotFoundState";
import { useLeadsAgentsStore } from "@/store/useLeadsAgentsStore";

export default function LeadDetailPage({ params }) {
  const unwrappedParams = use(params);
  const rawId = decodeURIComponent(unwrappedParams?.leadId || "");

  const getLeadById = useLeadsAgentsStore((s) => s.getLeadById);
  const openScheduleFollowUpModal = useLeadsAgentsStore((s) => s.openScheduleFollowUpModal);
  const openAssignBrokerModal = useLeadsAgentsStore((s) => s.openAssignBrokerModal);
  const openConvertLeadModal = useLeadsAgentsStore((s) => s.openConvertLeadModal);
  const openDeleteLeadModal = useLeadsAgentsStore((s) => s.openDeleteLeadModal);

  const lead = getLeadById(rawId);

  if (!lead) {
    return <NotFoundState itemType="Lead" backUrl="/dashboard/leads-agents" backLabel="Back to Leads" />;
  }

  return (
    <>
      <div className="flex flex-col gap-6 p-4 sm:p-6 pb-12 w-full max-w-7xl mx-auto">
        <Reveal>
          <LeadDetailHeader
            lead={lead}
            onFollowUp={() => openScheduleFollowUpModal(lead)}
            onConvert={() => openConvertLeadModal(lead)}
            onAssignBroker={() => openAssignBrokerModal(lead)}
            onDelete={() => openDeleteLeadModal(lead)}
          />
        </Reveal>

        {/* 6 KPI Metric Stats */}
        <Reveal>
          <LeadDetailStats lead={lead} />
        </Reveal>

        {/* Main Details Section */}
        <div className="flex flex-col gap-6 w-full rounded-lg border border-border bg-white/80 backdrop-blur-md p-4 sm:p-6 shadow-card">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <h2 className="font-montserrat font-bold text-[16px] text-purple">
              Overview of {lead?.name}
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full items-start">
            <Reveal className="w-full">
              <LeadOverviewCards lead={lead} />
            </Reveal>
            <Reveal className="w-full">
              <LeadSidebarCards
                lead={lead}
                onFollowUp={() => openScheduleFollowUpModal(lead)}
              />
            </Reveal>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ScheduleFollowUpDialog />
      <AssignBrokerDialog />
      <ConvertLeadDialog />
      <DeleteLeadDialog />
    </>
  );
}
