"use client";

import DetailHeader from "@/components/common/DetailHeader";
import CommonCard from "@/components/common/CommonCard";
import DetailTabNav from "@/components/common/DetailTabNav";
import OperatorHeaderTitle from "@/components/operators/header/OperatorHeaderTitle";
import OperatorHeaderActions from "@/components/operators/header/OperatorHeaderActions";
import OperatorDetailStats from "@/components/operators/header/OperatorDetailStats";
import OperatorOverviewTab from "@/components/operators/tabs/OperatorOverviewTab";
import OperatorFleetTab from "@/components/operators/tabs/OperatorFleetTab";
import OperatorTripsTab from "@/components/operators/tabs/OperatorTripsTab";
import OperatorPaymentsTab from "@/components/operators/tabs/OperatorPaymentsTab";

export default function OperatorDetailsView({
  operator,
  activeTab,
  onTabChange,
  onEdit,
  onRequestQuote,
  onRestore,
}) {
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "fleet", label: "Aircraft Fleet" },
    { id: "trips", label: "Trip History" },
    { id: "payments", label: "Payments" },
  ];

  return (
    <div className="flex flex-col w-full bg-page-bg min-h-screen">
      {/* Top Header connected with navbar */}
      <DetailHeader
        className="px-4 sm:px-6 py-4"
        backUrl="/dashboard/operators"
        backLabel="Back"
        titleContent={<OperatorHeaderTitle operator={operator} />}
        actions={
          <OperatorHeaderActions
            operator={operator}
            onEdit={onEdit}
            onRequestQuote={onRequestQuote}
            onRestore={onRestore}
          />
        }
      />

      {/* 5 KPI Stat Tiles in a row */}
      <div className="px-4 md:px-6 pt-4 sm:pt-6">
        <OperatorDetailStats operator={operator} />
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
          {/* Overview Tab: Core info, contacts & policies from API; ratings use UI fallbacks */}
          {activeTab === "overview" && (
            <OperatorOverviewTab operator={operator} />
          )}

          {/* Aircraft Fleet Tab: Uses operator.fleet from API, or defaultFleet fallback */}
          {activeTab === "fleet" && (
            <OperatorFleetTab operator={operator} />
          )}

          {/* Trip History Tab: Uses hardcoded defaultTrips until Trips module is connected */}
          {activeTab === "trips" && (
            <OperatorTripsTab operator={operator} />
          )}

          {/* Payments Tab: Uses hardcoded defaultPayments until Operator Payments module is connected */}
          {activeTab === "payments" && (
            <OperatorPaymentsTab operator={operator} />
          )}
        </div>
      </CommonCard>
    </div>
  );
}
