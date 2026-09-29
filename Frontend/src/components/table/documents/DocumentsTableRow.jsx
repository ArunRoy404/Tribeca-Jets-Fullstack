"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import RestoredBadge from "@/components/common/RestoredBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";

const CELL = "p-[10px] font-montserrat text-[12px]";

export default function DocumentsTableRow({ doc, isSelected, onToggleSelect, getRowActions, selectable = false, archived = false }) {
  if (!doc) return null;

  return (
    <TableRow className="border-border hover:bg-secondary/40 transition-colors">
      {selectable && (
        <TableCell className="p-[10px]">
          <Checkbox checked={Boolean(isSelected)} onCheckedChange={() => onToggleSelect?.(doc?.id)} aria-label={`Select ${doc?.title}`} />
        </TableCell>
      )}
      <TableCell className={`${CELL} font-bold text-foreground`}>
        <div className="flex items-center gap-2 min-w-0">
          <a href={doc?.href ?? undefined} target="_blank" rel="noreferrer" className="hover:underline truncate max-w-[260px]">
            {doc?.title}
          </a>
          {doc?.sensitive && <Lock className="size-3.5 text-muted-foreground shrink-0" aria-label="Restricted" />}
          {doc?.isRestored && <RestoredBadge at={doc?.restoredAtLabel} by={doc?.restoredByName} />}
        </div>
      </TableCell>
      <TableCell className="p-[10px] text-center">
        <div className="flex justify-center">
          <StatusBadge status={doc?.categoryLabel} bordered />
        </div>
      </TableCell>
      <TableCell className={`${CELL} text-foreground`}>
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[10px] text-muted-foreground">{doc?.ownerTypeLabel}</span>
          {doc?.ownerHref ? (
            <Link href={doc.ownerHref} className="font-semibold text-purple hover:underline truncate">
              {doc?.ownerLabel}
            </Link>
          ) : (
            <span className="font-semibold truncate">{doc?.ownerLabel}</span>
          )}
          {doc?.ownerClient && <span className="text-[11px] text-muted-foreground truncate">{doc.ownerClient}</span>}
        </div>
      </TableCell>
      <TableCell className={`${CELL} text-center`}>
        <div className="flex flex-col items-center gap-1">
          <span className="text-foreground whitespace-nowrap">{doc?.expiresOnLabel}</span>
          {doc?.expiry !== "NONE" && <StatusBadge status={doc?.expiryLabel} bordered />}
        </div>
      </TableCell>
      <TableCell className={`${CELL} text-muted-foreground max-w-[220px]`}>
        <div className="truncate" title={doc?.filename}>{doc?.filename}</div>
        <div className="text-[11px]">{doc?.fileSize}</div>
      </TableCell>
      {archived ? (
        <>
          <TableCell className={`${CELL} text-muted-foreground text-center whitespace-nowrap`}>{doc?.deletedAtLabel}</TableCell>
          <TableCell className={`${CELL} text-foreground text-center whitespace-nowrap`}>{doc?.deletedByName}</TableCell>
        </>
      ) : (
        <TableCell className={`${CELL} text-muted-foreground text-center whitespace-nowrap`}>
          <div>{doc?.filedBy}</div>
          <div className="text-[11px]">{doc?.filedAt}</div>
        </TableCell>
      )}
      <TableCell className="p-[10px] text-center">
        <div className="flex justify-center">
          <RowActionsMenu items={getRowActions?.(doc) ?? []} />
        </div>
      </TableCell>
    </TableRow>
  );
}
