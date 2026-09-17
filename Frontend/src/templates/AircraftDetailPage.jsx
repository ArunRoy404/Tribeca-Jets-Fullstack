"use client";

import { use } from "react";
import AircraftDetailsView from "@/components/aircraft/AircraftDetailsView";
import AddAircraftDialog from "@/components/aircraft/AddAircraftDialog";
import ArchiveAircraftDialog from "@/components/aircraft/ArchiveAircraftDialog";
import ChangeStatusDialog from "@/components/aircraft/ChangeStatusDialog";
import NotFoundState from "@/components/common/NotFoundState";
import TableStatus from "@/components/table/common/TableStatus";
import { useAircraftStore } from "@/store/useAircraftStore";
import { useAircraftDetail, useRestoreAircraft } from "@/hooks/aircraft";
import { toAircraftRow } from "@/lib/aircraft";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission } from "@/lib/permissions";

export default function AircraftDetailPage({ params }) {
  const unwrappedParams = use(params);
  const rawId = decodeURIComponent(unwrappedParams?.aircraftId || "");

  const activeTab = useAircraftStore((s) => s.activeTab);
  const setActiveTab = useAircraftStore((s) => s.setActiveTab);
  const openEditModal = useAircraftStore((s) => s.openEditModal);
  const openArchiveModal = useAircraftStore((s) => s.openArchiveModal);
  const openStatusModal = useAircraftStore((s) => s.openStatusModal);
  const { mutate: restoreAircraft } = useRestoreAircraft();

  // Assistants hold MANAGE_AIRCRAFT at READ scope — they see the aircraft,
  // not the buttons that would 403.
  const { canWrite } = usePermissions();
  const mayWrite = canWrite(Permission.MANAGE_AIRCRAFT);

  const { data, isPending, error, refetch } = useAircraftDetail(rawId);
  const aircraft = data ? toAircraftRow(data) : null;

  if (isPending || error) {
    return (
      <div className="p-4 sm:p-6">
        <TableStatus isLoading={isPending} error={error} onRetry={refetch} />
      </div>
    );
  }

  // An archived aircraft loads like any other — the Archived tab links here,
  // so refusing it would list a row and then deny it. Only an unknown id 404s,
  // which lands in `error` above.
  if (!aircraft) {
    return (
      <NotFoundState
        itemType="Aircraft"
        backUrl="/dashboard/aircraft"
        backLabel="Back to Aircraft"
      />
    );
  }

  return (
    <>
      <AircraftDetailsView
        aircraft={aircraft}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onEdit={openEditModal}
        onChangeStatus={openStatusModal}
        onArchive={openArchiveModal}
        onRestore={restoreAircraft}
        mayWrite={mayWrite}
      />

      <AddAircraftDialog />
      <ArchiveAircraftDialog />
      <ChangeStatusDialog />
    </>
  );
}
