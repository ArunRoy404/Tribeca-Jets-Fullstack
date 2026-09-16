"use client";

import { use, useMemo } from "react";
import LeadDetailHeader from "@/components/leads-agents/LeadDetailHeader";
import LeadDetailStats from "@/components/leads-agents/LeadDetailStats";
import LeadOverviewCards from "@/components/leads-agents/LeadOverviewCards";
import LeadSidebarCards from "@/components/leads-agents/LeadSidebarCards";
import ScheduleFollowUpDialog from "@/components/leads-agents/ScheduleFollowUpDialog";
import AssignBrokerDialog from "@/components/leads-agents/AssignBrokerDialog";
import ConvertLeadDialog from "@/components/leads-agents/ConvertLeadDialog";
import ArchiveLeadDialog from "@/components/leads-agents/ArchiveLeadDialog";
import AddLeadDialog from "@/components/leads-agents/AddLeadDialog";
import Reveal from "@/components/common/Reveal";
import NotFoundState from "@/components/common/NotFoundState";
import TableStatus from "@/components/table/common/TableStatus";
import { useLeadsAgentsStore } from "@/store/useLeadsAgentsStore";
import { useClient } from "@/hooks/clients";
import { useTripRequests } from "@/hooks/trip-requests";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission } from "@/lib/permissions";
import { toLeadRow, toTripRequestRow } from "@/lib/lead";

export default function LeadDetailPage({ params }) {
  const unwrappedParams = use(params);
  const rawId = decodeURIComponent(unwrappedParams?.leadId || "");

  const openFollowUpModal = useLeadsAgentsStore((s) => s.openFollowUpModal);
  const openAssignBrokerModal = useLeadsAgentsStore((s) => s.openAssignBrokerModal);
  const openConvertLeadModal = useLeadsAgentsStore((s) => s.openConvertLeadModal);
  const openArchiveLeadModal = useLeadsAgentsStore((s) => s.openArchiveLeadModal);
  const openEditLeadModal = useLeadsAgentsStore((s) => s.openEditLeadModal);

  const { canWrite } = usePermissions();
  const mayWrite = canWrite(Permission.MANAGE_CLIENTS);

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
  // The newest enquiry drives the header's route and value.
  const lead = data ? toLeadRow(data, requestsData?.data?.[0] ?? null) : null;

  if (isPending || error) {
    return (
      <div className="p-4 sm:p-6">
        <TableStatus isLoading={isPending} error={error} onRetry={refetch} />
      </div>
    );
  }

  // An archived lead loads like any other — the Archived tab links here.
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
    <>
      <div className="flex flex-col gap-6 p-4 sm:p-6 pb-12 w-full max-w-7xl mx-auto">
        <Reveal>
          <LeadDetailHeader
            lead={lead}
            mayWrite={mayWrite}
            onEdit={() => openEditLeadModal(lead)}
            onFollowUp={() => openFollowUpModal(lead)}
            onConvert={() => openConvertLeadModal(lead)}
            onAssignBroker={() => openAssignBrokerModal(lead)}
            onArchive={() => openArchiveLeadModal(lead)}
          />
        </Reveal>

        <Reveal>
          <LeadDetailStats lead={lead} />
        </Reveal>

        <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
          <Reveal className="flex-1 w-full min-w-0">
            <LeadOverviewCards lead={lead} requests={requests} />
          </Reveal>
          <Reveal className="w-full lg:w-96 shrink-0">
            <LeadSidebarCards lead={lead} />
          </Reveal>
        </div>
      </div>

      <AddLeadDialog />
      <ScheduleFollowUpDialog />
      <AssignBrokerDialog />
      <ConvertLeadDialog />
      <ArchiveLeadDialog />
    </>
  );
}
