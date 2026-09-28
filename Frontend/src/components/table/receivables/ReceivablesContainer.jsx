"use client";

import { useMemo, useState } from "react";
import { DollarSign, Edit, Eye, Mail, RotateCcw, Send, Trash2 } from "lucide-react";
import CommonCard from "@/components/common/CommonCard";
import Reveal from "@/components/common/Reveal";
import BulkDeleteDialog from "@/components/common/BulkDeleteDialog";
import TablePagination from "@/components/table/common/TablePagination";
import TableStatus from "@/components/table/common/TableStatus";
import ComposeEmailDialog from "@/components/common/email/ComposeEmailDialog";
import AddReceivableDialog from "@/components/receivables/AddReceivableDialog";
import RecordPaymentDialog from "@/components/receivables/RecordPaymentDialog";
import ReceivablesToolbar from "./ReceivablesToolbar";
import ReceivablesCardsContainer from "./ReceivablesCardsContainer";
import ReceivablesTable from "./ReceivablesTable";
import {
  useReceivables,
  useReceivablesTableParams,
  useRemoveReceivable,
  useRestoreReceivable,
  useUpdateReceivable,
} from "@/hooks/receivables";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission, Scope } from "@/lib/permissions";
import { toReceivableRow } from "@/lib/receivable";
import { ARCHIVE_TABS } from "@/lib/archive";
import { useReceivablesStore } from "@/store/useReceivablesStore";

/**
 * The Receivables board, API-backed: the URL is the state, the server pages,
 * and every figure on a row — total, paid, balance, status — is computed by
 * the API from the invoice and its payments.
 *
 * Two levels of write, both hidden rather than disabled: raising, editing and
 * recording payments is MANAGE_RECEIVABLES (a broker on their own trips);
 * archiving an invoice is an administrator's or senior broker's call, so the
 * checkbox column and the Archive action appear only at ALL scope. "Send
 * Reminder" emails the client through the shared compose form (Email
 * Templates, #21), opening on a payment template with the invoice's number,
 * total, balance and due date filled by the API — for a role that may send.
 */
export default function ReceivablesContainer({ revealDelay = 0 }) {
  const params = useReceivablesTableParams();
  const { data, isPending, error, refetch } = useReceivables(params.queryParams);

  const rows = useMemo(() => (data?.data ?? []).map(toReceivableRow), [data?.data]);
  const meta = data?.meta;
  const isArchived = params.tab === ARCHIVE_TABS.ARCHIVED;
  const isEmpty = !isPending && !error && rows.length === 0;

  const { canWrite, scopeFor } = usePermissions();
  const mayWrite = canWrite(Permission.MANAGE_RECEIVABLES);
  const maySend = canWrite(Permission.SEND_EMAILS);
  const [reminderFor, setReminderFor] = useState(null);
  const mayArchive = scopeFor(Permission.MANAGE_RECEIVABLES) === Scope.ALL;

  const openAddModal = useReceivablesStore((s) => s.openAddModal);
  const openEditModal = useReceivablesStore((s) => s.openEditModal);
  const openPaymentModal = useReceivablesStore((s) => s.openPaymentModal);

  const [selected, setSelected] = useState(() => new Set());
  const [bulkOpen, setBulkOpen] = useState(false);

  const { mutate: updateInvoice } = useUpdateReceivable();
  const { mutate: removeInvoices } = useRemoveReceivable();
  const { mutate: restoreInvoices } = useRestoreReceivable();

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
    (isArchived ? restoreInvoices : removeInvoices)(ids, {
      onSuccess: () => {
        setBulkOpen(false);
        setSelected(new Set());
      },
    });
  };

  const openDetails = (id) => params.setInvoice(id);

  const getRowActions = (row) => {
    const view = { label: "View Details", icon: <Eye />, onSelect: () => openDetails(row?.id) };
    if (isArchived) {
      return mayArchive
        ? [view, { label: "Restore", icon: <RotateCcw />, onSelect: () => restoreInvoices?.(row?.id) }]
        : [view];
    }
    if (!mayWrite) return [view];

    const actions = [view];
    if (row?.rawStatus === "SENT" && row?.hasBalance) {
      actions.push({ label: "Record Payment", icon: <DollarSign />, onSelect: () => openPaymentModal?.(row?.raw) });
      if (maySend) actions.push({ label: "Send Reminder", icon: <Mail />, onSelect: () => setReminderFor(row) });
    }
    if (row?.rawStatus === "DRAFT") {
      actions.push({ label: "Mark Sent", icon: <Send />, onSelect: () => updateInvoice?.({ id: row?.id, status: "SENT" }) });
    }
    actions.push({ label: "Edit", icon: <Edit />, onSelect: () => openEditModal?.(row?.raw) });
    // An invoice with money against it cannot be archived; the menu does not
    // offer what the API would refuse.
    if (mayArchive && row?.paymentCount === 0) {
      actions.push("separator");
      actions.push({ label: "Archive", icon: <Trash2 />, variant: "destructive", onSelect: () => removeInvoices?.(row?.id) });
    }
    return actions;
  };

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <ReceivablesToolbar
          search={params.search}
          setSearch={params.setSearch}
          state={params.state}
          setState={params.setState}
          limit={params.limit}
          setLimit={params.setLimit}
          tab={params.tab}
          setTab={params.setTab}
          selectedCount={selected.size}
          onBulkAction={() => setBulkOpen(true)}
          onAddReceivable={() => openAddModal()}
          mayWrite={mayWrite}
          mayArchive={mayArchive}
        />

        {isPending || error || isEmpty ? (
          <TableStatus
            isLoading={isPending}
            error={error}
            isEmpty={isEmpty}
            emptyMessage={isArchived ? "Nothing archived" : "No invoices match these filters"}
            emptyHint={
              isArchived
                ? "Archived invoices appear here and can be restored."
                : params.hasFilters
                  ? "Try clearing a filter."
                  : "Invoices are raised on a trip — here, or from the trip's own page."
            }
            onRetry={refetch}
          />
        ) : (
          <>
            <div className="relative w-full lg:hidden p-3">
              <ReceivablesCardsContainer
                items={rows}
                archived={isArchived}
                getRowActions={getRowActions}
                onSelectReceivable={openDetails}
              />
            </div>

            <ReceivablesTable
              pageItems={rows}
              getRowActions={getRowActions}
              onSelectReceivable={openDetails}
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
                itemLabel="invoices"
                page={meta?.page ?? 1}
                pageCount={meta?.totalPages ?? 1}
                onPageChange={(next) => params.goToPage(next, meta?.totalPages ?? 1)}
                onPrev={() => params.goToPage((meta?.page ?? 1) - 1, meta?.totalPages ?? 1)}
                onNext={() => params.goToPage((meta?.page ?? 1) + 1, meta?.totalPages ?? 1)}
              />
            </div>
          </>
        )}

        <AddReceivableDialog />
        <RecordPaymentDialog />
        <ComposeEmailDialog
          open={Boolean(reminderFor)}
          onOpenChange={(open) => !open && setReminderFor(null)}
          // An invoice billed to someone other than the trip's client (a travel
          // agent, a company) is about that bill, not their trip.
          context={{
            clientId: reminderFor?.clientId,
            tripId: reminderFor?.billedElsewhere ? undefined : reminderFor?.tripId,
            invoiceId: reminderFor?.id,
          }}
          category="PAYMENT"
          title="Send Payment Reminder"
          description="Email the client about this invoice. The amounts are filled in from the invoice as it stands today."
        />

        <BulkDeleteDialog
          open={bulkOpen}
          onOpenChange={setBulkOpen}
          items={selectedRows.map((row) => ({ id: row?.id, primary: `${row?.number} · ${row?.client}`, secondary: row?.total }))}
          itemLabel="invoices"
          action={isArchived ? "restore" : "remove"}
          note={
            isArchived
              ? undefined
              : "These invoices will be archived. Any that carry recorded payments are skipped — withdraw the payments first."
          }
          onConfirm={handleBulkAction}
        />
      </CommonCard>
    </Reveal>
  );
}
