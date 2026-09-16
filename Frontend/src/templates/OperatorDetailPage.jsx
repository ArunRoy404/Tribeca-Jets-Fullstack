"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import OperatorDetailHeader from "@/components/operators/OperatorDetailHeader";
import OperatorOverviewTab from "@/components/operators/tabs/OperatorOverviewTab";
import OperatorFleetTab from "@/components/operators/tabs/OperatorFleetTab";
import OperatorTripsTab from "@/components/operators/tabs/OperatorTripsTab";
import OperatorPaymentsTab from "@/components/operators/tabs/OperatorPaymentsTab";
import AddOperatorDialog from "@/components/operators/AddOperatorDialog";
import DeleteOperatorDialog from "@/components/operators/DeleteOperatorDialog";
import RequestOperatorQuoteDialog from "@/components/operator-sourcing/RequestOperatorQuoteDialog";
import Reveal from "@/components/common/Reveal";
import DetailTabNav from "@/components/common/DetailTabNav";
import NotFoundState from "@/components/common/NotFoundState";
import TableStatus from "@/components/table/common/TableStatus";
import { useOperatorsStore } from "@/store/useOperatorsStore";
import { useOperator, useRestoreOperator } from "@/hooks/operators";
import { toOperatorRow } from "@/lib/operator";

export default function OperatorDetailPage({ params }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const rawId = decodeURIComponent(unwrappedParams?.operatorId || "");

  const activeTab = useOperatorsStore((s) => s.activeTab);
  const setActiveTab = useOperatorsStore((s) => s.setActiveTab);
  const openEditModal = useOperatorsStore((s) => s.openEditModal);
  const openQuoteModal = useOperatorsStore((s) => s.openQuoteModal);
  const openDeleteModal = useOperatorsStore((s) => s.openDeleteModal);

  const { mutate: restoreOperator } = useRestoreOperator();

  const { data, isPending, error, refetch } = useOperator(rawId);
  const operator = data ? toOperatorRow(data) : null;

  if (isPending || error) {
    return (
      <div className="p-4 sm:p-6">
        <TableStatus isLoading={isPending} error={error} onRetry={refetch} />
      </div>
    );
  }

  // An archived operator loads like any other — the Archived tab links here,
  // so refusing it would list a row and then deny it. Only a genuinely unknown
  // id 404s, which lands in `error` above; this covers the remaining case of a
  // resolved-but-empty response.
  if (!operator) {
    return <NotFoundState itemType="Operator" backUrl="/dashboard/operators" backLabel="Back to Operators" />;
  }

  const tabs = [
    { id: "overview", label: "Overview" },
    // These three read empty until the Aircraft, Trips and Payments modules
    // exist. The API returns empty arrays rather than omitting the keys, so the
    // tabs render their own empty state instead of crashing on undefined.
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
            onRemove={openDeleteModal}
            onRestore={restoreOperator}
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
      <DeleteOperatorDialog onRemoved={() => router.push("/dashboard/operators")} />
      <RequestOperatorQuoteDialog />
    </>
  );
}
