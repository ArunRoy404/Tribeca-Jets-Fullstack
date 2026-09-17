"use client";

import { Copy, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission } from "@/lib/permissions";

const OUTLINE =
  "h-9 px-3.5 font-montserrat font-medium text-[12px] gap-1.5 bg-white border-border shadow-xs hover:bg-muted/40";

/**
 * Header actions.
 *
 * Send and the decisions live in the Status Actions card, which knows what the
 * quote's state allows — two places offering "Send to Client" with different
 * rules is how one of them ends up wrong.
 *
 * **Download PDF is gone.** It called `alert("Downloading PDF...")` and
 * produced no file. Scope §6.10 asks for print-ready output and it is real
 * work, not a button: nothing in this system generates a document yet.
 */
export default function QuoteHeaderActions({ quote, onEdit, onDuplicate, onRemove }) {
  const { canWrite } = usePermissions();
  const mayWrite = canWrite(Permission.MANAGE_TRIPS);
  const mayArchive = canWrite(Permission.DELETE_TRIPS);

  if (!mayWrite || quote?.isArchived) return null;

  return (
    <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
      <Button type="button" variant="outline" onClick={onDuplicate} className={OUTLINE}>
        <Copy className="size-3.5 text-muted-foreground" />
        <span>Copy to Draft</span>
      </Button>

      {/* An answered quote is what the client agreed to; editing it in place
          would rewrite that, so the API refuses it and the button is absent. */}
      {!quote?.isDecided && (
        <Button type="button" variant="outline" onClick={onEdit} className={OUTLINE}>
          <Pencil className="size-3.5 text-muted-foreground" />
          <span>Edit</span>
        </Button>
      )}

      {mayArchive && (
        <Button
          type="button"
          variant="outline"
          onClick={onRemove}
          className={`${OUTLINE} text-destructive hover:text-destructive`}
        >
          <Trash2 className="size-3.5" />
          <span>Remove</span>
        </Button>
      )}
    </div>
  );
}
