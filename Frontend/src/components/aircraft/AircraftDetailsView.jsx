"use client";

import DetailHeader from "@/components/common/DetailHeader";
import CommonCard from "@/components/common/CommonCard";
import DetailTabNav from "@/components/common/DetailTabNav";
import AircraftHeaderTitle from "@/components/aircraft/header/AircraftHeaderTitle";
import AircraftHeaderActions from "@/components/aircraft/header/AircraftHeaderActions";
import AircraftDetailStats from "@/components/aircraft/header/AircraftDetailStats";
import AircraftOverviewTab from "@/components/aircraft/tabs/AircraftOverviewTab";
import AircraftTripsTab from "@/components/aircraft/tabs/AircraftTripsTab";
import AircraftSpecsTab from "@/components/aircraft/tabs/AircraftSpecsTab";
import AircraftMaintenanceTab from "@/components/aircraft/tabs/AircraftMaintenanceTab";

export default function AircraftDetailsView({
  aircraft,
  activeTab,
  onTabChange,
  onEdit,
  onChangeStatus,
  onArchive,
  onRestore,
  mayWrite = true,
}) {
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "trips", label: "Trip History" },
    { id: "specs", label: "Specifications" },
    { id: "maintenance", label: "Maintenance", count: aircraft?.maintenance?.length || 0 },
  ];

  return (
    <div className="flex flex-col w-full bg-page-bg min-h-screen">
      {/* Top Header connected with navbar */}
      <DetailHeader
        className="px-4 sm:px-6 py-4"
        backUrl="/dashboard/aircraft"
        backLabel="Back"
        titleContent={<AircraftHeaderTitle aircraft={aircraft} />}
        actions={
          <AircraftHeaderActions
            aircraft={aircraft}
            onEdit={onEdit}
            onChangeStatus={onChangeStatus}
            onArchive={onArchive}
            onRestore={onRestore}
            mayWrite={mayWrite}
          />
        }
      />

      {/* 5 KPI Stat Tiles */}
      <div className="px-4 md:px-6 pt-4 sm:pt-6">
        <AircraftDetailStats aircraft={aircraft} />
      </div>

      {/* Main Details Wrapper using CommonCard */}
      <CommonCard className="m-4 md:m-6 border border-border overflow-hidden bg-white">
        {/* Tab Navigation Header Bar */}
        <div className="px-4 sm:px-6 pt-4">
          <DetailTabNav
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={onTabChange}
          />
        </div>

        {/* Tab Content Display */}
        <div className="w-full p-4 sm:p-6">
          {activeTab === "overview" && (
            <AircraftOverviewTab aircraft={aircraft} />
          )}

          {/* Trip History: Awaits Trips Module (#11) */}
          {activeTab === "trips" && (
            <AircraftTripsTab />
          )}

          {activeTab === "specs" && (
            <AircraftSpecsTab aircraft={aircraft} />
          )}

          {activeTab === "maintenance" && (
            <AircraftMaintenanceTab aircraft={aircraft} />
          )}
        </div>
      </CommonCard>
    </div>
  );
}
