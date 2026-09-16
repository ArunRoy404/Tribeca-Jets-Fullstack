"use client";

import { use, useMemo } from "react";
import CommonCard from "@/components/common/CommonCard";
import LeadDetailHeader from "@/components/leads-agents/LeadDetailHeader";
import LeadDetailStats from "@/components/leads-agents/LeadDetailStats";
import LeadOverviewSidebar from "@/components/leads-agents/LeadOverviewSidebar";
import LeadFollowUpsCard from "@/components/leads-agents/LeadFollowUpsCard";
import LeadInternalNotesCard from "@/components/leads-agents/LeadInternalNotesCard";
import LeadDocumentsCard from "@/components/leads-agents/LeadDocumentsCard";
import ScheduleFollowUpDialog from "@/components/leads-agents/ScheduleFollowUpDialog";
import AssignBrokerDialog from "@/components/leads-agents/AssignBrokerDialog";
import ConvertLeadDialog from "@/components/leads-agents/ConvertLeadDialog";
import ArchiveLeadDialog from "@/components/leads-agents/ArchiveLeadDialog";
import AddLeadDialog from "@/components/leads-agents/AddLeadDialog";
import NotFoundState from "@/components/common/NotFoundState";
import TableStatus from "@/components/table/common/TableStatus";
import { useLeadsAgentsStore } from "@/store/useLeadsAgentsStore";
import { useClient } from "@/hooks/clients";
import { useTripRequests } from "@/hooks/trip-requests";
import { toLeadRow, toTripRequestRow } from "@/lib/lead";

/**
 * LeadDetailPage
 *
 * A lead is a Client record at lead stage with associated TripRequests.
 *
 * API Data Sources:
 * - Lead entity: GET /api/clients/{id}
 * - Enquiries: GET /api/trip-requests?clientId={id}
 *
 * All hardcoded literals removed — missing values display honest em dashes ("—").
 */
export default function LeadDetailPage({ params }) {
  const unwrappedParams = use(params);
  const rawId = decodeURIComponent(unwrappedParams?.leadId || "");

  const openFollowUpModal = useLeadsAgentsStore((s) => s.openFollowUpModal);
  const openAssignBrokerModal = useLeadsAgentsStore((s) => s.openAssignBrokerModal);
  const openConvertLeadModal = useLeadsAgentsStore((s) => s.openConvertLeadModal);
  const openArchiveLeadModal = useLeadsAgentsStore((s) => s.openArchiveLeadModal);
  const openEditLeadModal = useLeadsAgentsStore((s) => s.openEditLeadModal);

  // A lead is a client — there is no separate leads endpoint.
  const { data, isPending, error, refetch } = useClient(rawId);
  // Their enquiries, which are trip requests against this client.
  const { data: requestsData } = useTripRequests(
    { clientId: rawId, limit: 50 },
    { enabled: Boolean(rawId) },
  );

  const requests = useMemo(
    () => (requestsData?.data ?? []).map(toTripRequestRow),
    [requestsData?.data],
  );

  const lead = useMemo(() => {
    return data ? toLeadRow(data, requestsData?.data?.[0] ?? null) : null;
  }, [data, requestsData?.data]);

  if (isPending) {
    return (
      <div className="p-4 sm:p-6">
        <TableStatus isLoading={isPending} error={error} onRetry={refetch} />
      </div>
    );
  }

  if (!lead) {
    return (
      <NotFoundState
        itemType="Lead"
        backUrl="/dashboard/leads-agents"
        backLabel="Back to Leads"
      />
    );
  }

  return (
    <div className="flex flex-col w-full bg-page-bg min-h-screen">
      {/* Top Header */}
      <LeadDetailHeader
        lead={lead}
        onEdit={() => openEditLeadModal(lead)}
        onFollowUp={() => openFollowUpModal(lead)}
        onConvert={() => openConvertLeadModal(lead)}
        onAssignBroker={() => openAssignBrokerModal(lead)}
        onArchive={() => openArchiveLeadModal(lead)}
      />

      {/* 6 Stats KPI Row */}
      <div className="px-4 md:px-6 pt-4 sm:pt-6">
        <LeadDetailStats lead={lead} />
      </div>

      {/* Main Details Wrapper using CommonCard */}
      <CommonCard className="m-4 md:m-6 border border-border overflow-hidden bg-white">
        {/* Tab Navigation / Header */}
        <div className="flex items-center px-4 sm:px-6 border-b border-border bg-white">
          <div className="py-3 px-1 border-b-2 border-purple text-purple font-montserrat font-semibold text-[13px] sm:text-[14px]">
            Overview of {lead.name}
          </div>
        </div>

        {/* 2-Column Section Layout: Thinner Left Sidebar (360px) + Wider Right Area (1fr) */}
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 p-4 sm:p-6 items-start bg-secondary/15">
          {/* Left Column (Enclosed in single Overview container) */}
          <LeadOverviewSidebar lead={lead} request={requests[0]} />

          {/* Right Column (Wider area for Follow-ups, Notes, Documents) */}
          <div className="flex flex-col gap-6 w-full min-w-0">
            <LeadFollowUpsCard
              lead={lead}
              onAddFollowUp={() => openFollowUpModal(lead)}
            />
            <LeadInternalNotesCard lead={lead} />
            <LeadDocumentsCard onUpload={() => {}} />
          </div>
        </div>
      </CommonCard>

      {/* Modals & Dialogs */}
      <AddLeadDialog />
      <ScheduleFollowUpDialog />
      <AssignBrokerDialog />
      <ConvertLeadDialog />
      <ArchiveLeadDialog />
    </div>
  );
}
