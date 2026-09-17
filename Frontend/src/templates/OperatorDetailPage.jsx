"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import OperatorDetailsView from "@/components/operators/OperatorDetailsView";
import AddOperatorDialog from "@/components/operators/AddOperatorDialog";
import DeleteOperatorDialog from "@/components/operators/DeleteOperatorDialog";
import RequestOperatorQuoteDialog from "@/components/operator-sourcing/RequestOperatorQuoteDialog";
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
    return (
      <NotFoundState
        itemType="Operator"
        backUrl="/dashboard/operators"
        backLabel="Back to Operators"
      />
    );
  }

  return (
    <>
      <OperatorDetailsView
        operator={operator}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onEdit={openEditModal}
        onRequestQuote={openQuoteModal}
        onRemove={openDeleteModal}
        onRestore={restoreOperator}
      />

      <AddOperatorDialog />
      <DeleteOperatorDialog onRemoved={() => router.push("/dashboard/operators")} />
      <RequestOperatorQuoteDialog />
    </>
  );
}
