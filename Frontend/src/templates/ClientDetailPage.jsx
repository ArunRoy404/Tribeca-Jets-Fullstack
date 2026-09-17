"use client";

import { use } from "react";
import DetailHeader from "@/components/common/DetailHeader";
import CommonCard from "@/components/common/CommonCard";
import ClientHeaderTitle from "@/components/clients/ClientHeaderTitle";
import ClientHeaderActions from "@/components/clients/ClientHeaderActions";
import ClientStatsRow from "@/components/clients/ClientStatsRow";
import ClientSummaryBar from "@/components/clients/ClientSummaryBar";
import ClientDetailSidebar from "@/components/clients/ClientDetailSidebar";
import ClientOverviewTab from "@/components/clients/ClientOverviewTab";
import ClientTripsTab from "@/components/clients/ClientTripsTab";
import ClientQuotesTab from "@/components/clients/ClientQuotesTab";
import ClientPaymentsTab from "@/components/clients/ClientPaymentsTab";
import ClientActivityTab from "@/components/clients/ClientActivityTab";
import AddClientDialog from "@/components/clients/AddClientDialog";
import ScheduleFollowUpDialog from "@/components/clients/ScheduleFollowUpDialog";
import ArchiveClientDialog from "@/components/clients/ArchiveClientDialog";
import DetailTabNav from "@/components/common/DetailTabNav";
import NotFoundState from "@/components/common/NotFoundState";
import TableStatus from "@/components/table/common/TableStatus";
import { useClientsStore } from "@/store/useClientsStore";
import { useClient, useUpdateClient, useRestoreClient } from "@/hooks/clients";
import { toClientRow } from "@/lib/client";

export default function ClientDetailPage({ params }) {
  const unwrappedParams = use(params);
  const rawId = decodeURIComponent(unwrappedParams?.clientId || "");

  const activeTab = useClientsStore((s) => s.activeTab);
  const setActiveTab = useClientsStore((s) => s.setActiveTab);
  const openEditModal = useClientsStore((s) => s.openEditModal);
  const openFollowUpModal = useClientsStore((s) => s.openFollowUpModal);
  const openArchiveModal = useClientsStore((s) => s.openArchiveModal);

  const { data, isPending, error, refetch } = useClient(rawId);
  const client = data ? toClientRow(data) : null;

  // Completing a follow-up clears the reminder and the note that went with it.
  // The note describes the call that has now happened, so leaving it behind
  // would attach it to whatever gets scheduled next.
  const { mutate: restoreClient, isPending: isRestoring } = useRestoreClient();
  const { mutate: updateClient, isPending: isCompleting } = useUpdateClient();
  const markFollowUpComplete = () => {
    if (!client?.id) return;
    updateClient({ id: client.id, nextFollowUpAt: null, followUpNote: null });
  };

  if (isPending || error) {
    return (
      <div className="p-4 sm:p-6">
        <TableStatus isLoading={isPending} error={error} onRetry={refetch} />
      </div>
    );
  }

  if (!client) {
    return <NotFoundState itemType="Client" backUrl="/dashboard/clients" backLabel="Back to Clients" />;
  }

  // Tab badge counts will be wired to meta.total once Trips, Quotes, Payments, and Activity APIs are connected
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "trips", label: "Trips" },
    { id: "quotes", label: "Quotes" },
    { id: "payments", label: "Payments" },
    { id: "activity", label: "Activity" },
  ];

  return (
    <div className="flex flex-col w-full bg-page-bg min-h-screen">
      {/* Top Header connected with navbar */}
      <DetailHeader
        className="px-4 sm:px-6 py-4"
        backUrl="/dashboard/clients"
        backLabel="Back to Clients"
        titleContent={<ClientHeaderTitle client={client} />}
        actions={
          <ClientHeaderActions
            client={client}
            onEdit={() => openEditModal(client)}
            onFollowUp={() => openFollowUpModal(client?.id || client)}
            onArchive={() => openArchiveModal(client)}
            onRestore={() => restoreClient(client)}
            isRestoring={isRestoring}
          />
        }
      />

      {/* 4 Stat Summary KPI Tiles */}
      <div className="px-4 md:px-6 pt-4 sm:pt-6">
        <ClientStatsRow client={client} />
      </div>

      {/* Main Details Wrapper using CommonCard */}
      <CommonCard className="m-4 md:m-6 border border-border overflow-hidden bg-white">
        {/* Single Row Flight Context Summary Bar */}
        <ClientSummaryBar client={client} />

        {/* 2-Column Section Layout inside CommonCard */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start p-4 sm:p-6">
          {/* Left Sidebar Column */}
          <ClientDetailSidebar
            client={client}
            onEditNotes={() => openEditModal(client)}
          />

          {/* Right Main Area with Tabbed Content */}
          <div className="flex flex-col gap-5 w-full min-w-0">
            {/* Tab Navigation Header Bar */}
            <DetailTabNav
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />

            {/* Tab Content Display */}
            <div className="w-full pt-1">
              {activeTab === "overview" && (
                <ClientOverviewTab
                  client={client}
                  onScheduleFollowUp={() => openFollowUpModal(client?.id || client)}
                  onSwitchToActivity={() => setActiveTab("activity")}
                  onMarkComplete={markFollowUpComplete}
                  isCompleting={isCompleting}
                />
              )}
              {activeTab === "trips" && (
                <ClientTripsTab
                  client={client}
                  onScheduleFollowUp={() => openFollowUpModal(client?.id || client)}
                  onMarkComplete={markFollowUpComplete}
                  isCompleting={isCompleting}
                />
              )}
              {activeTab === "quotes" && (
                <ClientQuotesTab
                  client={client}
                  onScheduleFollowUp={() => openFollowUpModal(client?.id || client)}
                  onMarkComplete={markFollowUpComplete}
                  isCompleting={isCompleting}
                />
              )}
              {activeTab === "payments" && (
                <ClientPaymentsTab
                  client={client}
                  onScheduleFollowUp={() => openFollowUpModal(client?.id || client)}
                  onMarkComplete={markFollowUpComplete}
                  isCompleting={isCompleting}
                />
              )}
              {activeTab === "activity" && (
                <ClientActivityTab
                  client={client}
                  onScheduleFollowUp={() => openFollowUpModal(client?.id || client)}
                  onMarkComplete={markFollowUpComplete}
                  isCompleting={isCompleting}
                />
              )}
            </div>
          </div>
        </div>
      </CommonCard>

      {/* Modals & Dialogs */}
      <AddClientDialog />
      <ScheduleFollowUpDialog />
      <ArchiveClientDialog />
    </div>
  );
}
