"use client";

import { use } from "react";
import AircraftDetailHeader from "@/components/aircraft/AircraftDetailHeader";
import AircraftOverviewTab from "@/components/aircraft/tabs/AircraftOverviewTab";
import AircraftTripsTab from "@/components/aircraft/tabs/AircraftTripsTab";
import AircraftSpecsTab from "@/components/aircraft/tabs/AircraftSpecsTab";
import AircraftMaintenanceTab from "@/components/aircraft/tabs/AircraftMaintenanceTab";
import AddAircraftDialog from "@/components/aircraft/AddAircraftDialog";
import DeleteAircraftDialog from "@/components/aircraft/DeleteAircraftDialog";
import SetMaintenanceDialog from "@/components/aircraft/SetMaintenanceDialog";
import Reveal from "@/components/common/Reveal";
import DetailTabNav from "@/components/common/DetailTabNav";
import NotFoundState from "@/components/common/NotFoundState";
import { useAircraftStore } from "@/store/useAircraftStore";

export default function AircraftDetailPage({ params }) {
  const unwrappedParams = use(params);
  const rawId = decodeURIComponent(unwrappedParams?.aircraftId || "");

  const getAircraftById = useAircraftStore((s) => s.getAircraftById);
  const activeTab = useAircraftStore((s) => s.activeTab);
  const setActiveTab = useAircraftStore((s) => s.setActiveTab);
  const openEditModal = useAircraftStore((s) => s.openEditModal);
  const openMaintenanceModal = useAircraftStore((s) => s.openMaintenanceModal);

  const aircraft = getAircraftById(rawId);

  if (!aircraft) {
    return <NotFoundState itemType="Aircraft" backUrl="/dashboard/aircraft" backLabel="Back to Aircraft" />;
  }

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "trips", label: "Trip History", count: aircraft?.tripHistory?.length || 0 },
    { id: "specs", label: "Specifications" },
    { id: "maintenance", label: "Maintenance", count: aircraft?.maintenance?.history?.length || 0 },
  ];

  return (
    <>
      <div className="flex flex-col gap-6 p-4 sm:p-6 pb-12 w-full max-w-7xl mx-auto">
        <Reveal>
          <AircraftDetailHeader
            aircraft={aircraft}
            onEdit={openEditModal}
            onToggleMaintenance={openMaintenanceModal}
          />
        </Reveal>

        {/* Tab Navigation Header Bar */}
        <Reveal>
          <DetailTabNav
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </Reveal>

        {/* Tab Content Display */}
        <Reveal className="w-full pt-2">
          {activeTab === "overview" && <AircraftOverviewTab aircraft={aircraft} />}
          {activeTab === "trips" && <AircraftTripsTab aircraft={aircraft} />}
          {activeTab === "specs" && <AircraftSpecsTab aircraft={aircraft} />}
          {activeTab === "maintenance" && (
            <AircraftMaintenanceTab
              aircraft={aircraft}
              onManage={() => openMaintenanceModal(aircraft)}
            />
          )}
        </Reveal>
      </div>

      <AddAircraftDialog />
      <DeleteAircraftDialog />
      <SetMaintenanceDialog />
    </>
  );
}
