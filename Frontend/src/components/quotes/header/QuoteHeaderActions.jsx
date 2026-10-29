"use client";

import { Copy, Download, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Module, Action } from "@/lib/access";
import { quotePdfUrl } from "@/services/quotes.service";

const OUTLINE =
  "h-9 px-3.5 font-montserrat font-medium text-[12px] gap-1.5 bg-white border-border shadow-xs hover:bg-muted/40";

/**
 * Header actions.
 *
 * Send and the decisions live in the Status Actions card, which knows what the
 * quote's state allows — two places offering "Send to Client" with different
 * rules is how one of them ends up wrong.
 *
 * Download PDF (#32) follows `GET /quotes/:id/pdf` directly so the browser
 * downloads the branded quotation with the httpOnly session cookie attached.
 */
export default function QuoteHeaderActions({ quote, onEdit, onDuplicate, onRemove }) {
  const { canAccess } = usePermissions();
  const mayCreate = canAccess(Module.QUOTES, Action.CREATE);
  const mayEdit = canAccess(Module.QUOTES, Action.EDIT);
  const mayArchive = canAccess(Module.QUOTES, Action.ARCHIVE);

  if (!quote?.id) return null;
  const archived = Boolean(quote?.isArchived);

  return (
    <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
      <Button asChild variant="outline" className={OUTLINE}>
        <a href={quotePdfUrl(quote.id)} target="_blank" rel="noreferrer">
          <Download className="size-3.5 text-muted-foreground" />
          <span>Download PDF</span>
        </a>
      </Button>

      {!archived && mayCreate && (
        <Button type="button" variant="outline" onClick={onDuplicate} className={OUTLINE}>
          <Copy className="size-3.5 text-muted-foreground" />
          <span>Copy to Draft</span>
        </Button>
      )}

      {/* An answered quote is what the client agreed to; editing it in place
          would rewrite that, so the API refuses it and the button is absent. */}
      {!archived && mayEdit && !quote?.isDecided && (
        <Button type="button" variant="outline" onClick={onEdit} className={OUTLINE}>
          <Pencil className="size-3.5 text-muted-foreground" />
          <span>Edit</span>
        </Button>
      )}

      {!archived && mayArchive && (
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
