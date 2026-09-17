"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  Edit,
  Copy,
  Send,
  Check,
  XCircle,
  Clock,
  RotateCcw,
  Trash2,
} from "lucide-react";
import CommonCard from "@/components/common/CommonCard";
import Reveal from "@/components/common/Reveal";
import TablePagination from "@/components/table/common/TablePagination";
import TableStatus from "@/components/table/common/TableStatus";
import BulkDeleteDialog from "@/components/common/BulkDeleteDialog";
import QuotesToolbar from "./QuotesToolbar";
import QuotesCardsContainer from "./QuotesCardsContainer";
import QuotesTable from "./QuotesTable";
import AddQuoteDialog from "@/components/quotes/AddQuoteDialog";
import DeleteQuoteDialog from "@/components/quotes/DeleteQuoteDialog";
import { useQuotesStore } from "@/store/useQuotesStore";
import {
  useDecideQuote,
  useDuplicateQuote,
  useQuotes,
  useQuotesTableParams,
  useRemoveQuote,
  useReopenQuote,
  useRestoreQuote,
  useSendQuote,
} from "@/hooks/quotes";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission } from "@/lib/permissions";
import { toQuoteRow } from "@/lib/quote";
import { ARCHIVE_TABS } from "@/lib/archive";

export default function QuotesContainer({ revealDelay = 0 }) {
  const router = useRouter();

  // The URL is the state. Every filter below reads and writes it, so the view
  // survives a reload and the back button steps through it.
  const params = useQuotesTableParams();
  const { data, isPending, error, refetch } = useQuotes(params.queryParams);

  const openAddQuoteModal = useQuotesStore((s) => s.openAddQuoteModal);
  const openDeleteQuoteModal = useQuotesStore((s) => s.openDeleteQuoteModal);

  const rows = useMemo(
    () => (data?.data ?? []).map(toQuoteRow),
    [data?.data],
  );
  const meta = data?.meta;
  const isArchived = params.tab === ARCHIVE_TABS.ARCHIVED;
  const isEmpty = !isPending && !error && rows.length === 0;

  const { canWrite } = usePermissions();
  const mayWrite = canWrite(Permission.MANAGE_TRIPS);
  const mayArchive = canWrite(Permission.DELETE_TRIPS);

  const [selected, setSelected] = useState(() => new Set());
  const [bulkOpen, setBulkOpen] = useState(false);

  const { mutate: send } = useSendQuote();
  const { mutate: decide } = useDecideQuote();
  const { mutate: reopen } = useReopenQuote();
  const { mutate: duplicate } = useDuplicateQuote();
  const { mutate: removeMany } = useRemoveQuote();
  // One hook serves both: it takes an array for the bulk action and a single
  // id for the row action.
  const { mutate: restoreQuotes } = useRestoreQuote();

  const selectedRows = useMemo(
    () => rows.filter((row) => selected.has(row?.id)),
    [rows, selected],
  );

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
    const run = isArchived ? restoreQuotes : removeMany;
    run(ids, {
      onSuccess: () => {
        setBulkOpen(false);
        // Those rows have left this tab; leaving them selected would keep the
        // button offering to act on rows it no longer shows.
        setSelected(new Set());
      },
    });
  };

  const openDetails = (id) => router?.push(`/dashboard/quotes/${id}`);

  /**
   * One definition of what a row can do, so the table and the mobile cards
   * offer the same menu rather than drifting apart.
   *
   * The menu follows the quote's state rather than listing everything and
   * collecting 409s: a draft cannot be approved because the client has not
   * seen it, and a settled quote is reopened rather than re-decided.
   */
  const getRowActions = (quote) => {
    const view = {
      label: "View Details",
      icon: <Eye />,
      onSelect: () => openDetails(quote?.id),
    };

    if (isArchived) {
      return mayArchive
        ? [
            view,
            {
              label: "Restore Quote",
              icon: <RotateCcw />,
              onSelect: () => restoreQuotes?.(quote?.id),
            },
          ]
        : [view];
    }

    if (!mayWrite) return [view];

    const actions = [view];

    if (quote?.rawStatus === "DRAFT") {
      actions.push({
        label: "Send to Client",
        icon: <Send />,
        onSelect: () => send?.({ id: quote?.id }),
      });
    }

    actions.push({
      label: "Edit Quote",
      icon: <Edit />,
      onSelect: () => openAddQuoteModal?.(quote),
    });
    actions.push({
      label: "Copy to New Draft",
      icon: <Copy />,
      onSelect: () => duplicate?.(quote?.id),
    });

    if (quote?.isDecided) {
      actions.push({
        label: "Undo Decision",
        icon: <RotateCcw />,
        onSelect: () => reopen?.(quote?.id),
      });
    } else if (quote?.rawStatus !== "DRAFT") {
      actions.push({
        label: "Client Accepted",
        icon: <Check className="text-success" />,
        onSelect: () => decide?.({ action: "approve", id: quote?.id }),
      });
      actions.push({
        label: "Client Declined",
        icon: <XCircle className="text-destructive" />,
        onSelect: () => decide?.({ action: "reject", id: quote?.id }),
      });
      actions.push({
        label: "Mark Expired",
        icon: <Clock className="text-warning" />,
        onSelect: () => decide?.({ action: "expire", id: quote?.id }),
      });
    }

    // Archiving is an administrator's call — a broker quietly removing the
    // quotes that were turned down would improve their own conversion rate.
    if (mayArchive) {
      actions.push("separator");
      actions.push({
        label: "Remove Quote",
        icon: <Trash2 />,
        variant: "destructive",
        onSelect: () => openDeleteQuoteModal?.(quote),
      });
    }

    return actions;
  };

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard
        variant="default"
        className="p-0 rounded-md overflow-hidden border-border w-full"
      >
        <QuotesToolbar
          search={params.search}
          setSearch={params.setSearch}
          status={params.status}
          setStatus={params.setStatus}
          assignedBrokerId={params.assignedBrokerId}
          setAssignedBrokerId={params.setAssignedBrokerId}
          limit={params.limit}
          setLimit={params.setLimit}
          tab={params.tab}
          setTab={params.setTab}
          onNewQuote={() => openAddQuoteModal?.(null)}
          selectedCount={selected.size}
          onBulkAction={() => setBulkOpen(true)}
          mayWrite={mayWrite}
          mayArchive={mayArchive}
        />

        {isPending || error || isEmpty ? (
          <TableStatus
            isLoading={isPending}
            error={error}
            isEmpty={isEmpty}
            emptyMessage={
              isArchived ? "Nothing archived" : "No quotes match these filters"
            }
            emptyHint={
              isArchived
                ? "Removed quotes appear here and can be restored."
                : params.hasFilters
                  ? "Try clearing a filter, or widening the status."
                  : "Price an enquiry and the offer will appear here."
            }
            onRetry={refetch}
          />
        ) : (
          <>
            <div className="relative w-full lg:hidden p-3">
              <QuotesCardsContainer
                items={rows}
                getActions={getRowActions}
                onItemClick={(item) => openDetails(item?.id)}
              />
            </div>

            <QuotesTable
              pageItems={rows}
              getRowActions={getRowActions}
              onSelectQuote={(item) => openDetails(item?.id)}
              selected={selected}
              onToggleRow={toggleRow}
              onSelectAll={() =>
                setSelected((prev) =>
                  prev.size === rows.length
                    ? new Set()
                    : new Set(rows.map((row) => row?.id)),
                )
              }
              selectable={mayArchive}
              archived={isArchived}
            />

            <div className="relative w-full">
              <TablePagination
                totalCount={meta?.total ?? 0}
                itemLabel="quotes"
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
          items={selectedRows.map((row) => ({
            id: row?.id,
            // Named, never counted: "Delete 12 items?" asks someone to trust a
            // number they cannot check, and a mis-click on select-all looks
            // identical to a deliberate selection.
            name: `${row?.reference} · ${row?.client} · ${row?.total}`,
          }))}
          itemLabel="quotes"
          action={isArchived ? "restore" : "remove"}
          onConfirm={handleBulkAction}
        />

        <AddQuoteDialog />
        <DeleteQuoteDialog />
      </CommonCard>
    </Reveal>
  );
}
