"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, PlusCircle, Calendar, Edit, Archive, RotateCcw } from "lucide-react";
import CommonCard from "@/components/common/CommonCard";
import Reveal from "@/components/common/Reveal";
import TablePagination from "@/components/table/common/TablePagination";
import BulkDeleteDialog from "@/components/common/BulkDeleteDialog";
import ClientsToolbar from "./ClientsToolbar";
import ClientCardsContainer from "./ClientCardsContainer";
import ClientsTable from "./ClientsTable";
import AddClientDialog from "@/components/clients/AddClientDialog";
import ScheduleFollowUpDialog from "@/components/clients/ScheduleFollowUpDialog";
import ArchiveClientDialog from "@/components/clients/ArchiveClientDialog";
import {
  useClients,
  useClientsTableParams,
  useRemoveClients,
  useRestoreClient,
  useRestoreClients,
} from "@/hooks/clients";
import { useClientsStore } from "@/store/useClientsStore";
import { ARCHIVE_TABS } from "@/lib/archive";
import { toClientRow } from "@/lib/client";

export default function ClientsContainer({ revealDelay = 0 }) {
  const router = useRouter();

  // The URL is the state. Every filter below reads and writes it, so the view
  // survives a reload and the back button steps through it.
  const params = useClientsTableParams();
  const clientsQuery = useClients(params?.queryParams);

  const openAddModal = useClientsStore((s) => s.openAddModal);
  const openEditModal = useClientsStore((s) => s.openEditModal);
  const openFollowUpModal = useClientsStore((s) => s.openFollowUpModal);
  const openArchiveModal = useClientsStore((s) => s.openArchiveModal);

  const rows = useMemo(
    () => (clientsQuery?.data?.data ?? []).map(toClientRow),
    [clientsQuery?.data?.data],
  );
  const meta = clientsQuery?.data?.meta;
  const pageCount = Math.max(meta?.totalPages ?? 1, 1);

  const [selected, setSelected] = useState(() => new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const { mutate: removeMany, isPending: isRemovingMany } = useRemoveClients();
  const { mutate: restoreMany, isPending: isRestoringMany } = useRestoreClients();
  const { mutate: restoreClient } = useRestoreClient();

  const isArchived = params?.tab === ARCHIVE_TABS.ARCHIVED;

  // Derived from the current page, so a row that leaves underneath us simply
  // drops out rather than being confirmed by name and then not found.
  const selectedRows = useMemo(
    () => rows.filter((row) => selected.has(row?.id)),
    [rows, selected],
  );

  const handleBulkAction = () => {
    const ids = selectedRows.map((row) => row?.id).filter(Boolean);
    if (!ids.length) return;
    const run = isArchived ? restoreMany : removeMany;
    run(ids, {
      onSuccess: () => {
        setBulkOpen(false);
        setSelected(new Set());
      },
    });
  };

  const toggleRow = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleOpenDetails = (item) => {
    router?.push(`/dashboard/clients/${encodeURIComponent(item?.id ?? "")}`);
  };

  const getRowActions = (item) =>
    isArchived
      ? [
          { label: "View Details", icon: <Eye />, onSelect: () => handleOpenDetails(item) },
          {
            label: "Restore Client",
            icon: <RotateCcw />,
            onSelect: () => restoreClient?.(item),
          },
        ]
      : [
          { label: "View Details", icon: <Eye />, onSelect: () => handleOpenDetails(item) },
          {
            label: "Create Trip",
            icon: <PlusCircle />,
            onSelect: () => router?.push("/dashboard/trips/new"),
          },
          {
            label: "Schedule Follow-up",
            icon: <Calendar />,
            onSelect: () => openFollowUpModal?.(item),
          },
          { label: "Edit Client", icon: <Edit />, onSelect: () => openEditModal?.(item) },
          "separator",
          {
            label: "Archive",
            icon: <Archive />,
            variant: "destructive",
            onSelect: () => openArchiveModal?.(item),
          },
        ];

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <ClientsToolbar
          search={params?.search}
          setSearch={params?.setSearch}
          statusFilter={params?.status}
          setStatusFilter={params?.setStatus}
          typeFilter={params?.type}
          setTypeFilter={params?.setType}
          brokerFilter={params?.assignedBrokerId}
          setBrokerFilter={params?.setAssignedBrokerId}
          followUpFilter={params?.followUp}
          setFollowUpFilter={params?.setFollowUp}
          limit={params?.limit}
          setLimit={params?.setLimit}
          onAddClient={openAddModal}
          selectedCount={selectedRows.length}
          onBulkAction={() => setBulkOpen(true)}
          tab={params?.tab}
          setTab={params?.setTab}
        />

        <div className="relative w-full lg:hidden p-3">
          <ClientCardsContainer
            items={rows}
            getRowActions={getRowActions}
            onSelectClient={handleOpenDetails}
            isLoading={clientsQuery?.isPending}
            error={clientsQuery?.error}
          />
        </div>

        <ClientsTable
          archived={isArchived}
          pageItems={rows}
          selected={selected}
          onSelectAll={() =>
            setSelected((prev) =>
              prev.size === rows.length ? new Set() : new Set(rows.map((r) => r?.id)),
            )
          }
          onToggleRow={toggleRow}
          getRowActions={getRowActions}
          onSelectClient={handleOpenDetails}
          isLoading={clientsQuery?.isPending}
          error={clientsQuery?.error}
          onRetry={clientsQuery?.refetch}
        />

        {/* Hidden until the first page lands, so the pager never shows
            "0 clients · Page 1 of 1" during the initial load. */}
        {meta ? (
          <div className="relative w-full">
            <TablePagination
              totalCount={meta?.total ?? 0}
              itemLabel={isArchived ? "archived clients" : "clients"}
              page={meta?.page ?? 1}
              pageCount={pageCount}
              onPrev={() => params?.goToPage?.((meta?.page ?? 1) - 1, pageCount)}
              onNext={() => params?.goToPage?.((meta?.page ?? 1) + 1, pageCount)}
              onPageChange={(next) => params?.goToPage?.(next, pageCount)}
            />
          </div>
        ) : null}

        <BulkDeleteDialog
          open={bulkOpen}
          onOpenChange={setBulkOpen}
          items={selectedRows.map((item) => ({
            id: item?.id,
            primary: item?.name,
            secondary: item?.email,
          }))}
          itemLabel="clients"
          action={isArchived ? "restore" : "remove"}
          note={
            isArchived
              ? "These clients will return to the main list, exactly as they were."
              : "These clients will be removed from the list. Trips, quotes and payments that reference them keep working."
          }
          onConfirm={handleBulkAction}
          isPending={isRemovingMany || isRestoringMany}
        />

        <AddClientDialog />
        <ScheduleFollowUpDialog />
        <ArchiveClientDialog />
      </CommonCard>
    </Reveal>
  );
}
