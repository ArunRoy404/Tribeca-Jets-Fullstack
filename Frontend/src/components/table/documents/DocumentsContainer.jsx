"use client";

import { useMemo, useState } from "react";
import CommonCard from "@/components/common/CommonCard";
import Reveal from "@/components/common/Reveal";
import BulkDeleteDialog from "@/components/common/BulkDeleteDialog";
import TablePagination from "@/components/table/common/TablePagination";
import TableStatus from "@/components/table/common/TableStatus";
import DocumentFormDialog from "@/components/documents/DocumentFormDialog";
import { useDocumentRowActions } from "@/components/documents/useDocumentRowActions";
import DocumentsToolbar from "./DocumentsToolbar";
import DocumentsTable from "./DocumentsTable";
import DocumentsCardsContainer from "./DocumentsCardsContainer";
import { useDocuments, useRemoveDocument, useRestoreDocument } from "@/hooks/documents";
import { ARCHIVE_TABS } from "@/lib/archive";
import { toDocumentRow } from "@/lib/document";

/**
 * The Document Vault screen (#22), API-backed: the URL is the state, the
 * server pages. Every client, trip and operator folder in one list, scoped
 * to what the caller may see. The checkbox column appears only with the
 * bulk action it feeds; a broker's bulk archive skips what they did not file.
 */
export default function DocumentsContainer({ params, revealDelay = 0 }) {
  const isArchived = params.tab === ARCHIVE_TABS.ARCHIVED;
  const { data, isPending, error, refetch } = useDocuments(params.queryParams);
  const docs = useMemo(() => (data?.data ?? []).map(toDocumentRow), [data?.data]);
  const meta = data?.meta;
  const isEmpty = !isPending && !error && docs.length === 0;

  const [dialog, setDialog] = useState({ open: false, document: null });
  const { getRowActions, mayManage } = useDocumentRowActions({
    onEdit: (row) => setDialog({ open: true, document: row }),
  });

  const [selected, setSelected] = useState(() => new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const { mutate: removeDocuments } = useRemoveDocument();
  const { mutate: restoreDocuments } = useRestoreDocument();

  const selectedRows = useMemo(() => docs.filter((row) => selected.has(row?.id)), [docs, selected]);
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
    (isArchived ? restoreDocuments : removeDocuments)(ids, {
      onSuccess: () => {
        setBulkOpen(false);
        setSelected(new Set());
      },
    });
  };

  const emptyMessage = isArchived ? "Nothing archived" : params.hasFilters ? "No documents match these filters" : "The vault is empty";
  const emptyHint = isArchived
    ? "Archived documents appear here and can be restored."
    : params.hasFilters
      ? "Try clearing a filter."
      : mayManage
        ? "File a document here, or from a client, trip or operator page."
        : "No documents have been filed yet.";

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <DocumentsToolbar
          params={params}
          selectedCount={selectedRows.length}
          onBulkAction={() => setBulkOpen(true)}
          onAdd={() => setDialog({ open: true, document: null })}
          mayManage={mayManage}
        />

        {isPending || error || isEmpty ? (
          <TableStatus
            isLoading={isPending}
            error={error}
            isEmpty={isEmpty}
            emptyMessage={emptyMessage}
            emptyHint={emptyHint}
            onRetry={refetch}
          />
        ) : (
          <>
            <DocumentsCardsContainer
              docs={docs}
              selected={selected}
              onToggleRow={toggleRow}
              getRowActions={getRowActions}
              selectable={mayManage}
              archived={isArchived}
            />
            <DocumentsTable
              docs={docs}
              selected={selected}
              onToggleRow={toggleRow}
              onSelectAll={() =>
                setSelected((prev) => (prev.size === docs.length ? new Set() : new Set(docs.map((d) => d?.id))))
              }
              getRowActions={getRowActions}
              selectable={mayManage}
              archived={isArchived}
            />
          </>
        )}

        {!isPending && !error && !isEmpty && (
          <div className="relative w-full">
            <TablePagination
              totalCount={meta?.total ?? 0}
              itemLabel="documents"
              page={meta?.page ?? 1}
              pageCount={meta?.totalPages ?? 1}
              onPageChange={(next) => params.goToPage(next, meta?.totalPages ?? 1)}
              onPrev={() => params.goToPage((meta?.page ?? 1) - 1, meta?.totalPages ?? 1)}
              onNext={() => params.goToPage((meta?.page ?? 1) + 1, meta?.totalPages ?? 1)}
            />
          </div>
        )}

        <DocumentFormDialog
          open={dialog.open}
          onOpenChange={(open) => setDialog((prev) => ({ ...prev, open }))}
          document={dialog.document}
        />

        <BulkDeleteDialog
          open={bulkOpen}
          onOpenChange={setBulkOpen}
          items={selectedRows.map((row) => ({ id: row?.id, name: row?.title }))}
          itemLabel="documents"
          action={isArchived ? "restore" : "remove"}
          onConfirm={handleBulkAction}
        />
      </CommonCard>
    </Reveal>
  );
}
