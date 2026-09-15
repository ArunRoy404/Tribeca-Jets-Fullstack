"use client";

import { use } from "react";
import OperatorDetailHeader from "@/components/operators/OperatorDetailHeader";
import OperatorOverviewTab from "@/components/operators/tabs/OperatorOverviewTab";
import OperatorFleetTab from "@/components/operators/tabs/OperatorFleetTab";
import OperatorTripsTab from "@/components/operators/tabs/OperatorTripsTab";
import OperatorPaymentsTab from "@/components/operators/tabs/OperatorPaymentsTab";
import AddOperatorDialog from "@/components/operators/AddOperatorDialog";
import RequestOperatorQuoteDialog from "@/components/operator-sourcing/RequestOperatorQuoteDialog";
import Reveal from "@/components/common/Reveal";
import DetailTabNav from "@/components/common/DetailTabNav";
import NotFoundState from "@/components/common/NotFoundState";
import { useOperatorsStore } from "@/store/useOperatorsStore";

export default function OperatorDetailPage({ params }) {
  const unwrappedParams = use(params);
  const rawId = decodeURIComponent(unwrappedParams?.operatorId || "");

  const getOperatorById = useOperatorsStore((s) => s.getOperatorById);
  const activeTab = useOperatorsStore((s) => s.activeTab);
  const setActiveTab = useOperatorsStore((s) => s.setActiveTab);
  const openEditModal = useOperatorsStore((s) => s.openEditModal);
  const openQuoteModal = useOperatorsStore((s) => s.openQuoteModal);

  const operator = getOperatorById(rawId);

  if (!operator) {
    return <NotFoundState itemType="Operator" backUrl="/dashboard/operators" backLabel="Back to Operators" />;
  }

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "fleet", label: "Aircraft Fleet", count: operator?.fleet?.length || 0 },
    { id: "trips", label: "Trip History", count: operator?.tripHistory?.length || 0 },
    { id: "payments", label: "Payments", count: operator?.payments?.length || 0 },
  ];

  return (
    <>
      <div className="flex flex-col gap-6 p-4 sm:p-6 pb-12 w-full max-w-7xl mx-auto">
        <Reveal>
          <OperatorDetailHeader
            operator={operator}
            onEdit={openEditModal}
            onRequestQuote={openQuoteModal}
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
          {activeTab === "overview" && <OperatorOverviewTab operator={operator} />}
          {activeTab === "fleet" && <OperatorFleetTab operator={operator} />}
          {activeTab === "trips" && <OperatorTripsTab operator={operator} />}
          {activeTab === "payments" && <OperatorPaymentsTab operator={operator} />}
        </Reveal>
      </div>

      <AddOperatorDialog />
      <RequestOperatorQuoteDialog />
    </>
  );
}
