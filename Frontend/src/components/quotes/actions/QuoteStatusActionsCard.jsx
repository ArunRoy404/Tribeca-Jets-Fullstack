"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Clock, Mail, Plane, RotateCcw, Send, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import DetailCard from "@/components/quotes/DetailCard";
import ComposeEmailDialog from "@/components/common/email/ComposeEmailDialog";
import {
  useDecideQuote,
  useReopenQuote,
  useRestoreQuote,
  useSendQuote,
} from "@/hooks/quotes";
import { useBookQuote } from "@/hooks/trips";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { emailWillReachRecipient } from "@/lib/email";

const BUTTON = "w-full h-11 justify-center gap-2 font-montserrat font-medium text-[13px] transition-all";

/**
 * What can be done to this quote, right now.
 *
 * The card offers what the quote's state actually allows rather than three
 * buttons that collect 409s. A draft can only be sent — the client has not
 * seen it, so there is nothing to accept — and a settled quote is reopened
 * rather than re-decided.
 *
 * **Book Trip** turns an approved quote into a booking (Trips, #11): the API
 * copies the quote's client, route, aircraft, party and price, and refuses a
 * second booking of the same quote. Once booked, the card links the trip
 * instead of offering the button again. (An earlier "Book Leg" button routed
 * to an empty trip form that ignored the quote; it is not coming back.)
 *
 * **Email to Client** (Email Templates, #21) opens the shared compose form
 * with the quote's number, total, FET and validity filled by the API; once a
 * mail server accepts it, the quote is marked sent. **Mark as Sent** stays
 * for a quote handed over another way, and says it delivers nothing.
 */
export default function QuoteStatusActionsCard({ quote }) {
  const { mutate: send, isPending: isSending } = useSendQuote();
  const { mutate: decide, isPending: isDeciding } = useDecideQuote();
  const { mutate: reopen, isPending: isReopening } = useReopenQuote();
  const { mutate: restore, isPending: isRestoring } = useRestoreQuote();
  const { mutate: book, isPending: isBooking } = useBookQuote();
  const router = useRouter();

  const { canWrite } = usePermissions();
  const mayWrite = canWrite(Permission.MANAGE_TRIPS);
  const mayArchive = canWrite(Permission.DELETE_TRIPS);
  const maySend = canWrite(Permission.SEND_EMAILS);
  const [composeOpen, setComposeOpen] = useState(false);

  if (!quote) return null;

  const busy = isSending || isDeciding || isReopening || isRestoring || isBooking;

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
            {maySend && (
              <Button type="button" disabled={busy} onClick={() => setComposeOpen(true)} className={cn(BUTTON, "shadow-button")}>
                <Mail className="size-4" />
                <span>Email to Client</span>
              </Button>
            )}
            <Button
              type="button"
              variant={maySend ? "outline" : "default"}
              disabled={busy}
              onClick={() => send({ id: quote.id })}
              className={cn(BUTTON, maySend ? "border-border" : "shadow-button")}
            >
              <Send className="size-4" />
              <span>Mark as Sent</span>
            </Button>
            {/* Said plainly rather than implied by a paper-plane icon: a
                broker who believes a quote was emailed will not chase it. */}
            <p className="font-montserrat text-[11px] text-muted-foreground text-center">
              Mark as Sent starts the clock for a quote handed over another way. It emails nothing.
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

            {maySend && (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setComposeOpen(true)}
                className={cn(BUTTON, "border-border")}
              >
                <Mail className="size-4 text-muted-foreground" />
                <span>Email Again</span>
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => send({ id: quote.id })}
              className={cn(BUTTON, "border-border")}
            >
              <Send className="size-4 text-muted-foreground" />
              <span>Mark Sent Again</span>
            </Button>
          </>
        )}

        {quote.trip ? (
          <Link
            href={`/dashboard/trips/${quote.trip.id}`}
            className={cn(BUTTON, "inline-flex items-center rounded-md border border-success/40 text-success bg-success/5 hover:bg-success/15")}
          >
            <Plane className="size-4" />
            <span>Booked as {quote.trip.reference}</span>
          </Link>
        ) : (
          quote.rawStatus === "APPROVED" && (
            <Button
              type="button"
              disabled={busy}
              onClick={() => book({ quoteId: quote.id }, { onSuccess: (trip) => router.push(`/dashboard/trips/${trip?.id}`) })}
              className={cn(BUTTON, "shadow-button")}
            >
              <Plane className="size-4" />
              <span>Book Trip</span>
            </Button>
          )
        )}

        {!quote.isOpen && !quote.trip && (
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

      {maySend && (
        <ComposeEmailDialog
          open={composeOpen}
          onOpenChange={setComposeOpen}
          context={{ clientId: quote.clientId, quoteId: quote.id, tripId: quote.trip?.id }}
          category="QUOTE_FOLLOW_UP"
          title={`Email ${quote.reference} to the client`}
          description="The quote's total, FET and validity are filled in by the system. Once it is accepted, the quote is marked sent."
          onSent={(email) => emailWillReachRecipient(email) && send({ id: quote.id })}
        />
      )}
    </DetailCard>
  );
}
