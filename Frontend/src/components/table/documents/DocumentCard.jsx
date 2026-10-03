"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import RestoredBadge from "@/components/common/RestoredBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { Checkbox } from "@/components/ui/checkbox";

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <p className="font-montserrat text-[10px] text-muted-foreground whitespace-nowrap">{label}</p>
      <div className="font-montserrat font-semibold text-[12px] text-foreground truncate">{children}</div>
    </div>
  );
}

/** One document below `lg`, with the same menu as its table row. */
export default function DocumentCard({ doc, selected, onToggleSelect, actions, selectable = false, archived = false }) {
  if (!doc) return null;

  return (
    <div className="flex flex-col gap-2.5 items-start p-3 w-full rounded-sm border border-border bg-white">
      <div className="flex items-center justify-between gap-2 w-full">
        <div className="flex items-center gap-2 min-w-0">
          {selectable && <Checkbox checked={Boolean(selected)} onCheckedChange={onToggleSelect} aria-label={`Select ${doc?.title}`} />}
          <a
            href={doc?.href ?? undefined}
            target="_blank"
            rel="noreferrer"
            className="font-montserrat font-bold text-[13px] text-foreground truncate hover:underline"
          >
            {doc?.title}
          </a>
          {doc?.sensitive && <Lock className="size-3.5 text-muted-foreground shrink-0" aria-label="Restricted" />}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {doc?.isRestored && <RestoredBadge at={doc?.restoredAtLabel} by={doc?.restoredByName} />}
          {actions?.length > 0 && <RowActionsMenu items={actions} />}
        </div>
      </div>

      <div className="flex items-start justify-between gap-3 w-full">
        <Field label="Category">
          <StatusBadge status={doc?.categoryLabel} bordered />
        </Field>
        <Field label={doc?.ownerTypeLabel}>
          {doc?.ownerHref ? (
            <Link href={doc.ownerHref} className="text-purple hover:underline">
              {doc?.ownerLabel}
            </Link>
          ) : (
            doc?.ownerLabel
          )}
        </Field>
      </div>

      <div className="flex items-start justify-between gap-3 w-full">
        <Field label="Expires">
          <span className="flex items-center gap-1.5">
            {doc?.expiresOnLabel}
            {doc?.expiry !== "NONE" && <StatusBadge status={doc?.expiryLabel} bordered />}
          </span>
        </Field>
        {archived ? (
          <Field label="Removed">{`${doc?.deletedAtLabel} · ${doc?.deletedByName}`}</Field>
        ) : (
          <Field label="Filed">{`${doc?.filedBy} · ${doc?.filedAt}`}</Field>
        )}
      </div>

      <p className="font-montserrat text-[11px] text-muted-foreground truncate w-full">
        {doc?.filename} · {doc?.fileSize}
      </p>
    </div>
  );
}
