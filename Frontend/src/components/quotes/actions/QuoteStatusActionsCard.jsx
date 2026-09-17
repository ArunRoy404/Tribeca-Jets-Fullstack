"use client";

import { Check, Clock, RotateCcw, Send, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import DetailCard from "@/components/quotes/DetailCard";
import {
  useDecideQuote,
  useReopenQuote,
  useRestoreQuote,
  useSendQuote,
} from "@/hooks/quotes";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const BUTTON = "w-full h-11 justify-center gap-2 font-montserrat font-medium text-[13px] transition-all";

/**
 * What can be done to this quote, right now.
 *
 * The card offers what the quote's state actually allows rather than three
 * buttons that collect 409s. A draft can only be sent — the client has not
 * seen it, so there is nothing to accept — and a settled quote is reopened
 * rather than re-decided.
 *
 * "Book Leg" is gone. It routed to `/dashboard/trips/new?quoteId=…`, a screen
 * that does not read the parameter, so it lost the quote and opened an empty
 * trip form. Turning an approved quote into a booking arrives with Trips (#11).
 */
export default function QuoteStatusActionsCard({ quote }) {
  const { mutate: send, isPending: isSending } = useSendQuote();
  const { mutate: decide, isPending: isDeciding } = useDecideQuote();
  const { mutate: reopen, isPending: isReopening } = useReopenQuote();
  const { mutate: restore, isPending: isRestoring } = useRestoreQuote();

  const { canWrite } = usePermissions();
  const mayWrite = canWrite(Permission.MANAGE_TRIPS);
  const mayArchive = canWrite(Permission.DELETE_TRIPS);

  if (!quote) return null;

  const busy = isSending || isDeciding || isReopening || isRestoring;

  // An archived quote offers one thing: bringing it back. Everything else
  // would fail server-side anyway, because writes refuse an archived row.
  if (quote.isArchived) {
    return (
      <DetailCard title="Status Actions">
        <div className="flex flex-col gap-3 w-full">
          <p className="font-montserrat text-[13px] text-muted-foreground">
            This quote is archived. Restore it to work on it again.
          </p>
          {mayArchive && (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => restore(quote.id)}
              className={cn(BUTTON, "border-purple/40 text-purple bg-purple/5 hover:bg-purple/15")}
            >
              <RotateCcw className="size-4" />
              <span>Restore Quote</span>
            </Button>
          )}
        </div>
      </DetailCard>
    );
  }

  if (!mayWrite) {
    return (
      <DetailCard title="Status Actions">
        <p className="font-montserrat text-[13px] text-muted-foreground">
          Your role can view this quote but not change it.
        </p>
      </DetailCard>
    );
  }

  return (
    <DetailCard title="Status Actions">
      <div className="flex flex-col gap-3 w-full">
        {quote.rawStatus === "DRAFT" && (
          <>
            <Button
              type="button"
              disabled={busy}
              onClick={() => send({ id: quote.id })}
              className={cn(BUTTON, "shadow-button")}
            >
              <Send className="size-4" />
              <span>Send to Client</span>
            </Button>
            {/* Said plainly rather than implied by a paper-plane icon: a
                broker who believes a quote was emailed will not chase it. */}
            <p className="font-montserrat text-[11px] text-muted-foreground text-center">
              Marks it sent and starts the clock. No email is sent yet.
            </p>
          </>
        )}

        {quote.isOpen && quote.rawStatus !== "DRAFT" && (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => decide({ action: "approve", id: quote.id })}
              className={cn(BUTTON, "border-success/40 text-success bg-success/5 hover:bg-success/15 hover:text-success")}
            >
              <Check className="size-4 text-success" />
              <span>Client Accepted</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => decide({ action: "reject", id: quote.id })}
              className={cn(BUTTON, "border-destructive/40 text-destructive bg-destructive/5 hover:bg-destructive/15 hover:text-destructive")}
            >
              <XCircle className="size-4 text-destructive" />
              <span>Client Declined</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => decide({ action: "expire", id: quote.id })}
              className={cn(BUTTON, "border-warning/40 text-warning bg-warning/5 hover:bg-warning/15 hover:text-warning")}
            >
              <Clock className="size-4 text-warning" />
              <span>Mark Expired</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => send({ id: quote.id })}
              className={cn(BUTTON, "border-border")}
            >
              <Send className="size-4 text-muted-foreground" />
              <span>Send Again</span>
            </Button>
          </>
        )}

        {!quote.isOpen && (
          <>
            {/* Every decision is reversible, so a mis-click on Accepted is not
                a permanent record of a sale that never happened. */}
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => reopen(quote.id)}
              className={cn(BUTTON, "border-purple/40 text-purple bg-purple/5 hover:bg-purple/15 hover:text-purple")}
            >
              <RotateCcw className="size-4" />
              <span>Undo Decision</span>
            </Button>
            <p className="font-montserrat text-[11px] text-muted-foreground text-center">
              Returns the quote to where it was before the decision.
            </p>
          </>
        )}
      </div>
    </DetailCard>
  );
}
