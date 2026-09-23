"use client";

import { useState } from "react";
import { Download, FileText, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import TableStatus from "@/components/table/common/TableStatus";
import FileUpload, { ACCEPT } from "@/components/common/FileUpload";
import { uploadUrl } from "@/services/uploads.service";
import {
  useRemoveUpload,
  useRestoreUpload,
  useUserDocuments,
} from "@/hooks/uploads";
import { formatLastLogin } from "@/lib/user";

/**
 * A team member's document folder — client adjustment #7.
 *
 * > "I want there to be a folder for each broker that I can attach tax forms
 * > to. For example, a broker (mark) makes a commission with us, we need to
 * > give him a 1099 tax form."
 *
 * The folder is a query, not a second table: every live document filed about
 * this person. So removing a document and removing the file are one act, with
 * nothing to keep in step.
 *
 * Uploads here are **private and owned**, which is what makes the tab safe:
 * the API lets this user and an administrator read them, and answers another
 * broker with a 404 rather than a 403 — a 403 would confirm the document
 * exists, which turns a staff list into a register of who has been paid.
 */
function fileSize(bytes) {
  if (!bytes && bytes !== 0) return "—";
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.max(1, Math.round(kb))} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export default function UserDocumentsTab({ userId, userName, canManage }) {
  // Archived is a view of the same list, not separate state — two sources for
  // "which half am I looking at" will disagree.
  const [archived, setArchived] = useState(false);

  const { data, meta, isPending, error, refetch } = useUserDocuments(userId, {
    archived: archived || undefined,
    limit: 50,
  });
  const { mutate: removeDocument, isPending: isRemoving } = useRemoveUpload();
  const { mutate: restoreDocument, isPending: isRestoring } = useRestoreUpload();

  const documents = data ?? [];
  const busy = isRemoving || isRestoring;

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex flex-col gap-1">
          <p className="font-montserrat font-bold text-[14px] text-foreground">
            Documents
          </p>
          <p className="font-montserrat text-[12px] text-muted-foreground">
            {/* Says who can see this, because "who else reads my tax form" is
                the first question anyone asks about a folder like this. */}
            Visible to {userName || "this team member"} and administrators only.
          </p>
        </div>

        {canManage ? (
          <FileUpload
            kind="document"
            visibility="PRIVATE"
            ownerUserId={userId}
            accept={ACCEPT.document}
            buttonLabel="Upload Document"
            disabled={archived}
          />
        ) : null}
      </div>

      {/* Two views of one list. Rendered as a pair of small toggles rather than
          a tab strip, because this sits inside a sheet that already has tabs. */}
      <div className="flex items-center gap-2">
        {[
          { id: false, label: "Current" },
          { id: true, label: "Removed" },
        ].map((view) => (
          <button
            key={String(view.id)}
            type="button"
            onClick={() => setArchived(view.id)}
            className={`font-montserrat text-[12px] px-3 h-7 rounded-sm border cursor-pointer transition-colors ${
              archived === view.id
                ? "border-purple text-purple bg-purple/10"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {view.label}
          </button>
        ))}
        {meta?.total ? (
          <span className="font-montserrat text-[12px] text-muted-foreground ml-auto">
            {meta.total} {meta.total === 1 ? "document" : "documents"}
          </span>
        ) : null}
      </div>

      {isPending || error || documents.length === 0 ? (
        <TableStatus
          isLoading={isPending}
          error={error}
          isEmpty={!isPending && !error && documents.length === 0}
          emptyMessage={archived ? "No removed documents" : "No documents on file"}
          emptyHint={
            archived
              ? "Anything removed from this folder appears here."
              : canManage
                ? "Upload a tax form, contract or anything else filed about them."
                : "Nothing has been filed here yet."
          }
          onRetry={refetch}
        />
      ) : (
        <ul className="flex flex-col gap-2 w-full">
          {documents?.map((document) => (
            <li
              key={document?.id}
              className="flex items-center gap-3 rounded-sm border border-border px-3 py-2.5 w-full"
            >
              <div className="flex items-center justify-center rounded-sm bg-info/10 text-info size-8 shrink-0">
                <FileText className="size-4" />
              </div>

              <div className="flex flex-col min-w-0 flex-1">
                <p className="font-montserrat font-medium text-[13px] text-foreground truncate">
                  {/* The label if one was given, else the filename. A required
                      label just produces "document1" — the filename is usually
                      already the answer. */}
                  {document?.label || document?.filename}
                </p>
                <p className="font-montserrat text-[11px] text-muted-foreground truncate">
                  {fileSize(document?.size)} ·{" "}
                  {formatLastLogin(document?.createdAt)}
                  {document?.label ? ` · ${document?.filename}` : ""}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {!archived ? (
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    title="Download"
                  >
                    {/* A plain anchor, not a fetch: the session is an httpOnly
                        cookie, so the browser authenticates the request itself
                        and the server sends it as an attachment. */}
                    <a
                      href={uploadUrl(document?.url)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Download className="size-4" />
                    </a>
                  </Button>
                ) : null}

                {canManage ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    disabled={busy}
                    title={archived ? "Restore" : "Remove"}
                    onClick={() =>
                      archived
                        ? restoreDocument(document?.id)
                        : removeDocument(document?.id)
                    }
                  >
                    {archived ? (
                      <Undo2 className="size-4" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
