"use client";

import { use, useState } from "react";
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
import ClientCreditTab from "@/components/client-credits/ClientCreditTab";
import DocumentsPanel from "@/components/documents/DocumentsPanel";
import AddClientDialog from "@/components/clients/AddClientDialog";
import ScheduleFollowUpDialog from "@/components/clients/ScheduleFollowUpDialog";
import ArchiveClientDialog from "@/components/clients/ArchiveClientDialog";
import DetailTabNav from "@/components/common/DetailTabNav";
import NotFoundState from "@/components/common/NotFoundState";
import TableStatus from "@/components/table/common/TableStatus";
import ComposeEmailDialog from "@/components/common/email/ComposeEmailDialog";
import { useClientsStore } from "@/store/useClientsStore";
import { useClient, useUpdateClient, useRestoreClient } from "@/hooks/clients";
import { useCurrentUser } from "@/hooks/auth";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Action, Module } from "@/lib/access";
import { Permission } from "@/lib/permissions";
import { toClientRow } from "@/lib/client";

export default function ClientDetailPage({ params }) {
  const unwrappedParams = use(params);
  const rawId = decodeURIComponent(unwrappedParams?.clientId || "");

  const activeTab = useClientsStore((s) => s.activeTab);
  const setActiveTab = useClientsStore((s) => s.setActiveTab);
  const openEditModal = useClientsStore((s) => s.openEditModal);
  const openFollowUpModal = useClientsStore((s) => s.openFollowUpModal);
  const openArchiveModal = useClientsStore((s) => s.openArchiveModal);

  // Money on account is financial data. An assistant holds VIEW_FINANCIALS at
  // NONE, and the tab is *hidden* rather than shown and refused — a tab that
  // only ever renders a 403 reads as a broken app, not as a boundary.
  const { can, canWrite, canAccess } = usePermissions();
  const { data: currentUser } = useCurrentUser();
  const isAssistant = currentUser?.role === "ASSISTANT";
  const mayEdit = canAccess(Module.CLIENTS, Action.EDIT);
  const mayArchive = canAccess(Module.CLIENTS, Action.ARCHIVE);
  const mayCreateTrip = canAccess(Module.TRIPS, Action.CREATE);
  const maySend = canWrite(Permission.SEND_EMAILS);
  const [composeOpen, setComposeOpen] = useState(false);
  const maySeeMoney = !isAssistant && can(Permission.VIEW_FINANCIALS);
  const maySeeInvoices = can(Permission.VIEW_RECEIVABLES);
  const maySeeDocuments = can(Permission.VIEW_DOCUMENTS);

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

  const handleFollowUp = mayEdit ? () => openFollowUpModal(client?.id || client) : undefined;
  const handleComplete = mayEdit ? markFollowUpComplete : undefined;

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
    // The invoices billed to this client and what has come in (Receivables,
    // #16) — hidden, not refused, for a role that may not read them.
    ...(maySeeInvoices ? [{ id: "payments", label: "Payments" }] : []),
    // Money on account is its own thing, not a payment: a payment settles an
    // invoice, a credit is money the client is holding with us.
    ...(maySeeMoney ? [{ id: "credit", label: "Credit" }] : []),
    // The client's folder in the Document Vault (#22) — passports, IDs,
    // charter agreements, wire confirmations.
    ...(maySeeDocuments ? [{ id: "documents", label: "Documents" }] : []),
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
            onEdit={mayEdit ? () => openEditModal(client) : undefined}
            onFollowUp={handleFollowUp}
            onArchive={mayArchive ? () => openArchiveModal(client) : undefined}
            onRestore={mayArchive ? () => restoreClient(client) : undefined}
            isRestoring={isRestoring}
            onSendEmail={maySend ? () => setComposeOpen(true) : undefined}
            mayCreateTrip={mayCreateTrip}
          />
        }
      />
      <ComposeEmailDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        context={{ clientId: client?.id }}
        title="Email this client"
        description="Start from a template or write it. It is recorded on the client's Activity."
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
            onEditNotes={mayEdit ? () => openEditModal(client) : undefined}
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
                  onScheduleFollowUp={handleFollowUp}
                  onSwitchToActivity={() => setActiveTab("activity")}
                  onMarkComplete={handleComplete}
                  isCompleting={isCompleting}
                />
              )}
              {activeTab === "trips" && (
                <ClientTripsTab
                  client={client}
                  onScheduleFollowUp={handleFollowUp}
                  onMarkComplete={handleComplete}
                  isCompleting={isCompleting}
                />
              )}
              {activeTab === "quotes" && (
                <ClientQuotesTab
                  client={client}
                  onScheduleFollowUp={handleFollowUp}
                  onMarkComplete={handleComplete}
                  isCompleting={isCompleting}
                />
              )}
              {activeTab === "payments" && maySeeInvoices && (
                <ClientPaymentsTab
                  client={client}
                  onScheduleFollowUp={handleFollowUp}
                  onMarkComplete={handleComplete}
                  isCompleting={isCompleting}
                />
              )}
              {activeTab === "credit" && maySeeMoney && (
                <ClientCreditTab client={client} />
              )}
              {activeTab === "documents" && maySeeDocuments && (
                <DocumentsPanel
                  owner={{ type: "CLIENT", id: client?.id, label: client?.name }}
                  readOnly={client?.isArchived}
                />
              )}
              {activeTab === "activity" && (
                <ClientActivityTab
                  client={client}
                  onScheduleFollowUp={handleFollowUp}
                  onMarkComplete={handleComplete}
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
