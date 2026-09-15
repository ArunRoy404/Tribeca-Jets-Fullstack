"use client";

import { use } from "react";
import ClientDetailHeader from "@/components/clients/ClientDetailHeader";
import ClientDetailSidebar from "@/components/clients/ClientDetailSidebar";
import ClientOverviewTab from "@/components/clients/ClientOverviewTab";
import ClientTripsTab from "@/components/clients/ClientTripsTab";
import ClientQuotesTab from "@/components/clients/ClientQuotesTab";
import ClientPaymentsTab from "@/components/clients/ClientPaymentsTab";
import ClientActivityTab from "@/components/clients/ClientActivityTab";
import AddClientDialog from "@/components/clients/AddClientDialog";
import ScheduleFollowUpDialog from "@/components/clients/ScheduleFollowUpDialog";
import ArchiveClientDialog from "@/components/clients/ArchiveClientDialog";
import Reveal from "@/components/common/Reveal";
import DetailTabNav from "@/components/common/DetailTabNav";
import NotFoundState from "@/components/common/NotFoundState";
import { useClientsStore } from "@/store/useClientsStore";

export default function ClientDetailPage({ params }) {
  const unwrappedParams = use(params);
  const rawId = decodeURIComponent(unwrappedParams?.clientId || "");

  const getClientById = useClientsStore((s) => s.getClientById);
  const activeTab = useClientsStore((s) => s.activeTab);
  const setActiveTab = useClientsStore((s) => s.setActiveTab);
  const openEditModal = useClientsStore((s) => s.openEditModal);
  const openFollowUpModal = useClientsStore((s) => s.openFollowUpModal);

  const client = getClientById(rawId);

  if (!client) {
    return <NotFoundState itemType="Client" backUrl="/dashboard/clients" backLabel="Back to Clients" />;
  }

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "trips", label: "Trips", count: 6 },
    { id: "quotes", label: "Quotes", count: 3 },
    { id: "payments", label: "Payments", count: 4 },
    { id: "activity", label: "Activity", count: 8 },
  ];

  return (
    <>
      <div className="flex flex-col gap-6 p-4 sm:p-6 pb-12 w-full max-w-7xl mx-auto">
        <Reveal>
          <ClientDetailHeader client={client} />
        </Reveal>

        {/* Main Content Split Grid */}
        <div className="flex flex-col lg:flex-row items-start gap-6 w-full pt-2">
          {/* Left Sidebar Column */}
          <Reveal className="w-full lg:w-auto">
            <ClientDetailSidebar
              client={client}
              onEditNotes={() => openEditModal(client)}
            />
          </Reveal>

          {/* Right Main Area with Tabbed Content */}
          <Reveal className="flex-1 w-full min-w-0">
            <div className="flex flex-col gap-5 w-full">
              {/* Tab Navigation Header Bar */}
              <DetailTabNav
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />

              {/* Tab Content Display */}
              <div className="w-full pt-2">
                {activeTab === "overview" && (
                  <ClientOverviewTab
                    client={client}
                    onScheduleFollowUp={() => openFollowUpModal(client?.id)}
                  />
                )}
                {activeTab === "trips" && (
                  <ClientTripsTab
                    onScheduleFollowUp={() => openFollowUpModal(client?.id)}
                  />
                )}
                {activeTab === "quotes" && (
                  <ClientQuotesTab
                    onScheduleFollowUp={() => openFollowUpModal(client?.id)}
                  />
                )}
                {activeTab === "payments" && (
                  <ClientPaymentsTab
                    onScheduleFollowUp={() => openFollowUpModal(client?.id)}
                  />
                )}
                {activeTab === "activity" && (
                  <ClientActivityTab
                    onScheduleFollowUp={() => openFollowUpModal(client?.id)}
                  />
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      <AddClientDialog />
      <ScheduleFollowUpDialog />
      <ArchiveClientDialog />
    </>
  );
}
