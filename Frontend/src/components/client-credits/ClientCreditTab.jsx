"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import DetailCard from "@/components/common/DetailCard";
import FilterTabs from "@/components/table/common/FilterTabs";
import TableStatus from "@/components/table/common/TableStatus";
import TablePagination from "@/components/table/common/TablePagination";
import ClientCreditSummary from "@/components/client-credits/ClientCreditSummary";
import CreditMovementForm from "@/components/client-credits/CreditMovementForm";
import CreditMovementRow from "@/components/client-credits/CreditMovementRow";
import {
  useClientCredits,
  useCreateCredit,
  useCreditSummary,
  useRemoveCredit,
  useRestoreCredit,
  useUpdateCredit,
} from "@/hooks/clientCredits";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission } from "@/lib/permissions";

const TABS = ["Ledger", "Withdrawn"];
const PAGE_SIZE = 10;

/**
 * Credit / money on account (client adjustment #9).
 *
 * The client asked for one editable number. This is a ledger, because the
 * second half of his own sentence — "select if it was used towards another
 * trip" — is a second kind of movement, and a balance that changes with
 * nothing saying which trip consumed it is an argument waiting to happen.
 *
 * He still gets the edit he asked for; it just lands on a row.
 */
export default function ClientCreditTab({ client }) {
  const clientId = client?.id;
  const [tab, setTab] = useState(TABS[0]);
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);

  const { canWrite } = usePermissions();
  // Money on account is financial data: an assistant holds VIEW_FINANCIALS at
  // NONE and never sees this tab's figures at all, which is the same line the
  // API draws.
  const mayWrite = canWrite(Permission.VIEW_FINANCIALS);

  const archived = tab === "Withdrawn";
  const summary = useCreditSummary(clientId);
  const ledger = useClientCredits(clientId, { page, limit: PAGE_SIZE, archived });

  const create = useCreateCredit();
  const update = useUpdateCredit();
  const remove = useRemoveCredit();
  const restore = useRestoreCredit();

  const movements = ledger.data?.data ?? [];
  const meta = ledger.data?.meta;

  const changeTab = (next) => {
    setTab(next);
    // Page 3 of the ledger is not page 3 of the withdrawn movements.
    setPage(1);
    setEditing(null);
  };

  // A client the desk has closed is read-only, the same split the API makes:
  // the balance still reads, because the Archived tab links straight here.
  // `isArchived` is what `toArchiveFields` exposes — the raw `deletedAt` never
  // reaches a component.
  const closed = Boolean(client?.isArchived);
  const canRecord = mayWrite && !closed;

  return (
    <DetailCard className="gap-5 p-4 sm:p-6">
      <ClientCreditSummary
        summary={summary.data}
        isPending={summary.isPending}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterTabs options={TABS} value={tab} onValueChange={changeTab} />
        {canRecord && !adding && !archived && (
          <Button size="sm" onClick={() => setAdding(true)}>
            Record movement
          </Button>
        )}
      </div>

      {closed && mayWrite && (
        <p className="font-montserrat text-[12px] text-muted-foreground">
          This client is archived. The account is readable but cannot be changed
          until they are restored.
        </p>
      )}

      {adding && (
        <div className="rounded-md border border-border p-4">
          <CreditMovementForm
            isPending={create.isPending}
            onCancel={() => setAdding(false)}
            onSubmit={(values) =>
              create.mutate(
                { clientId, ...values },
                { onSuccess: () => { setAdding(false); setPage(1); } },
              )
            }
          />
        </div>
      )}

      <TableStatus
        isLoading={ledger.isPending}
        error={ledger.error}
        isEmpty={movements.length === 0}
        emptyMessage={
          archived ? "Nothing has been withdrawn" : "No money on account"
        }
        emptyHint={
          archived
            ? "Movements taken off the ledger appear here, with who removed them."
            : canRecord
              ? "Record what a client kept on account after a cancellation, and what they later used."
              : "Credits and applications will appear here."
        }
        onRetry={ledger.refetch}
      />

      {movements.length > 0 && (
        <div className="flex flex-col divide-y divide-border">
          {movements.map((movement) => (
            <CreditMovementRow
              key={movement.id}
              movement={movement}
              canWrite={canRecord}
              isEditing={editing === movement.id}
              isSaving={update.isPending}
              onEdit={() => setEditing(movement.id)}
              onCancelEdit={() => setEditing(null)}
              onSave={(values) =>
                update.mutate(
                  { id: movement.id, ...values },
                  { onSuccess: () => setEditing(null) },
                )
              }
              onRemove={() => remove.mutate(movement.id)}
              onRestore={() => restore.mutate(movement.id)}
            />
          ))}
        </div>
      )}

      {meta?.totalPages > 1 && (
        <TablePagination
          totalCount={meta.total}
          itemLabel={archived ? "withdrawn movements" : "movements"}
          page={meta.page}
          pageCount={meta.totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
          onPageChange={(next) => setPage(next)}
        />
      )}
    </DetailCard>
  );
}
