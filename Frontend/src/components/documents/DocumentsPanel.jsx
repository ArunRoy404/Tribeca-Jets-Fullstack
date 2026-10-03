"use client";

import { useMemo, useState } from "react";
import { FileText, Image as ImageIcon, Lock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/common/StatusBadge";
import RestoredBadge from "@/components/common/RestoredBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import TableStatus from "@/components/table/common/TableStatus";
import DocumentFormDialog from "@/components/documents/DocumentFormDialog";
import { useDocumentRowActions } from "@/components/documents/useDocumentRowActions";
import { useDocuments } from "@/hooks/documents";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission } from "@/lib/permissions";
import { toDocumentRow } from "@/lib/document";

const OWNER_FIELD = { CLIENT: "clientId", TRIP: "tripId", OPERATOR: "operatorId" };

/**
 * One folder of the vault (#22) — a client's, a trip's or an operator's —
 * shown on that record's own page. The same documents the vault lists,
 * through the same endpoint with the owner's id; filing here puts the
 * document in this folder without asking which.
 *
 * `owner` is `{ type: "CLIENT" | "TRIP" | "OPERATOR", id, label }`.
 * `readOnly` is for an archived record: its folder still opens, and takes
 * no new filings — the API refuses them. `hideTitle` drops the heading
 * when the panel sits inside a card that already says "Documents".
 */
export default function DocumentsPanel({ owner, readOnly = false, compact = false, hideTitle = false }) {
  const { can } = usePermissions();
  const [archived, setArchived] = useState(false);
  const [dialog, setDialog] = useState({ open: false, document: null });
  const { data, isPending, error, refetch } = useDocuments(
    { [OWNER_FIELD[owner?.type]]: owner?.id, archived: archived || undefined, limit: 50 },
    { enabled: Boolean(owner?.id) && can(Permission.VIEW_DOCUMENTS) },
  );
  const rows = useMemo(() => (data?.data ?? []).map(toDocumentRow), [data?.data]);
  const total = data?.meta?.total ?? 0;
  const isEmpty = !isPending && !error && rows.length === 0;

  const { getRowActions, mayManage } = useDocumentRowActions({
    onEdit: (row) => setDialog({ open: true, document: row }),
    showOwner: false,
  });

  if (!can(Permission.VIEW_DOCUMENTS)) return null;

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {!hideTitle && <p className="font-montserrat font-bold text-[14px] text-foreground">Documents</p>}
          {!isPending && (
            <span className="font-montserrat text-[12px] text-muted-foreground">
              {total} {archived ? "archived" : total === 1 ? "document" : "documents"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setArchived((prev) => !prev)}>
            {archived ? "Show current" : "Show archived"}
          </Button>
          {mayManage && !readOnly && !archived && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setDialog({ open: true, document: null })}>
              <Plus className="size-3.5" />
              File a Document
            </Button>
          )}
        </div>
      </div>

      {isPending || error || isEmpty ? (
        <TableStatus
          isLoading={isPending}
          error={error}
          isEmpty={isEmpty}
          emptyMessage={archived ? "Nothing archived" : "No documents on file"}
          emptyHint={
            archived
              ? "Archived documents appear here and can be restored."
              : mayManage && !readOnly
                ? "Charter agreements, passports, wire confirmations and certificates filed here stay with this record."
                : ""
          }
          onRetry={refetch}
        />
      ) : (
        <div className="flex flex-col gap-2 w-full">
          {rows.map((row) => (
            <div
              key={row?.id}
              className="flex items-start gap-3 p-3 w-full rounded-sm border border-border bg-white"
            >
              <div className="flex items-center justify-center rounded-sm bg-purple/10 text-purple size-9 shrink-0">
                {row?.isImage ? <ImageIcon className="size-4" /> : <FileText className="size-4" />}
              </div>
              <div className="flex flex-1 flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <a
                    href={row?.href ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="font-montserrat font-semibold text-[13px] text-foreground hover:underline truncate"
                  >
                    {row?.title}
                  </a>
                  {row?.sensitive && <Lock className="size-3.5 text-muted-foreground" aria-label="Restricted" />}
                  <StatusBadge status={row?.categoryLabel} bordered />
                  {row?.expiry !== "NONE" && <StatusBadge status={row?.expiryLabel} bordered />}
                  {row?.isRestored && <RestoredBadge at={row?.restoredAtLabel} by={row?.restoredByName} />}
                </div>
                <p className="font-montserrat text-[11px] text-muted-foreground truncate">
                  {row?.filename} · {row?.fileSize}
                  {row?.expiresOn ? ` · expires ${row?.expiresOnLabel}` : ""}
                  {compact ? "" : ` · filed by ${row?.filedBy}, ${row?.filedAt}`}
                </p>
                {row?.isArchived && (
                  <p className="font-montserrat text-[11px] text-muted-foreground">
                    Archived {row?.deletedAtLabel} by {row?.deletedByName}
                  </p>
                )}
                {row?.notes && !compact && (
                  <p className="font-montserrat text-[12px] text-foreground">{row?.notes}</p>
                )}
              </div>
              <RowActionsMenu items={getRowActions(row)} />
            </div>
          ))}
        </div>
      )}

      <DocumentFormDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((prev) => ({ ...prev, open }))}
        document={dialog.document}
        owner={dialog.document ? null : owner}
      />
    </div>
  );
}
