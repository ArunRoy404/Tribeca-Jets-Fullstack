"use client";

import { useMemo, useState } from "react";
import { Eye, RotateCcw, Trash2 } from "lucide-react";
import CommonCard from "@/components/common/CommonCard";
import Reveal from "@/components/common/Reveal";
import BulkDeleteDialog from "@/components/common/BulkDeleteDialog";
import TablePagination from "@/components/table/common/TablePagination";
import TableStatus from "@/components/table/common/TableStatus";
import ReferralsToolbar from "./ReferralsToolbar";
import ReferralsTable from "./ReferralsTable";
import ReferralCard from "./ReferralCard";
import {
  useReferrals,
  useReferralsTableParams,
  useRemoveReferral,
  useRestoreReferral,
} from "@/hooks/referrals";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission, Scope } from "@/lib/permissions";
import { toReferralRow } from "@/lib/referral";
import { ARCHIVE_TABS } from "@/lib/archive";

/** The desk's Referrals board (#11), API-backed. */
export default function ReferralsContainer({ revealDelay = 0 }) {
  const params = useReferralsTableParams();
  const { data, isPending, error, refetch } = useReferrals(params.queryParams);

  const rows = useMemo(() => (data?.data ?? []).map(toReferralRow), [data?.data]);
  const meta = data?.meta;
  const isArchived = params.tab === ARCHIVE_TABS.ARCHIVED;
  const isEmpty = !isPending && !error && rows.length === 0;

  // Archiving is an administrator's or senior broker's call; a broker marks a
  // referral Lost or Cancelled instead. The checkbox column goes with it.
  const { scopeFor } = usePermissions();
  const mayArchive = scopeFor(Permission.MANAGE_REFERRALS) === Scope.ALL;

  const [selected, setSelected] = useState(() => new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const { mutate: removeReferrals } = useRemoveReferral();
  const { mutate: restoreReferrals } = useRestoreReferral();

  const selectedRows = useMemo(() => rows.filter((row) => selected.has(row?.id)), [rows, selected]);
  const toggleRow = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleBulkAction = () => {
    const ids = selectedRows.map((row) => row?.id).filter(Boolean);
    if (!ids.length) return;
    (isArchived ? restoreReferrals : removeReferrals)(ids, {
      onSuccess: () => {
        setBulkOpen(false);
        setSelected(new Set());
      },
    });
  };

  const openDetails = (id) => params.setReferral(id);

  const getRowActions = (row) => {
    const view = { label: "Open", icon: <Eye />, onSelect: () => openDetails(row?.id) };
    if (!mayArchive) return [view];
    if (isArchived) return [view, { label: "Restore", icon: <RotateCcw />, onSelect: () => restoreReferrals?.(row?.id) }];
    return [view, "separator", { label: "Archive", icon: <Trash2 />, variant: "destructive", onSelect: () => removeReferrals?.(row?.id) }];
  };

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <ReferralsToolbar
          search={params.search}
          setSearch={params.setSearch}
          status={params.status}
          setStatus={params.setStatus}
          agentId={params.agentId}
          setAgentId={params.setAgentId}
          limit={params.limit}
          setLimit={params.setLimit}
          tab={params.tab}
          setTab={params.setTab}
          selectedCount={selected.size}
          onBulkAction={() => setBulkOpen(true)}
          mayArchive={mayArchive}
        />

        {isPending || error || isEmpty ? (
          <TableStatus
            isLoading={isPending}
            error={error}
            isEmpty={isEmpty}
            emptyMessage={isArchived ? "Nothing archived" : "No referrals match these filters"}
            emptyHint={
              isArchived
                ? "Archived referrals appear here and can be restored."
                : params.hasFilters
                  ? "Try clearing a filter."
                  : "Referrals submitted through the partner portal arrive here."
            }
            onRetry={refetch}
          />
        ) : (
          <>
            <div className="relative w-full lg:hidden p-3 flex flex-col gap-3">
              {rows.map((row) => (
                <ReferralCard key={row.id} item={row} actions={getRowActions(row)} onClick={() => openDetails(row.id)} />
              ))}
            </div>

            <ReferralsTable
              pageItems={rows}
              getRowActions={getRowActions}
              onSelectReferral={openDetails}
              selected={selected}
              onToggleRow={toggleRow}
              onSelectAll={() =>
                setSelected((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map((row) => row?.id))))
              }
              selectable={mayArchive}
              archived={isArchived}
            />

            <div className="relative w-full">
              <TablePagination
                totalCount={meta?.total ?? 0}
                itemLabel="referrals"
                page={meta?.page ?? 1}
                pageCount={meta?.totalPages ?? 1}
                onPageChange={(next) => params.goToPage(next, meta?.totalPages ?? 1)}
                onPrev={() => params.goToPage((meta?.page ?? 1) - 1, meta?.totalPages ?? 1)}
                onNext={() => params.goToPage((meta?.page ?? 1) + 1, meta?.totalPages ?? 1)}
              />
            </div>
          </>
        )}

        <BulkDeleteDialog
          open={bulkOpen}
          onOpenChange={setBulkOpen}
          items={selectedRows.map((row) => ({ id: row?.id, name: `${row?.reference} · ${row?.clientName} · ${row?.agent}` }))}
          itemLabel="referrals"
          action={isArchived ? "restore" : "remove"}
          onConfirm={handleBulkAction}
        />
      </CommonCard>
    </Reveal>
  );
}
