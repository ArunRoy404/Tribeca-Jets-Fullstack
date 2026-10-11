import { Ban, Building2, Check, Clock, Edit3, RotateCcw, XCircle } from "lucide-react";
import SectionCard from "@/components/common/SectionCard";
import StatusBadge from "@/components/common/StatusBadge";
import { cn } from "@/lib/utils";

/**
 * One operator's answer, in the comparison view.
 *
 * `responseTime` and `price` arrive already formatted by the mapper, and both
 * render an em dash when the operator has not come back — never "0h" or "$0",
 * which would make an operator who has not answered look like the fastest and
 * cheapest on the board.
 */
export default function QuoteCard({
  quote,
  onApprove,
  onReject,
  onDecline,
  onRecordResponse,
  onReopen,
  mayWrite = true,
  isDeciding = false,
}) {
  const isDecided = Boolean(quote?.isDecided);
  const isAwaiting = quote?.rawStatus === "AWAITING_RESPONSE";

  return (
    <SectionCard
      header={
        <>
          <div className="flex flex-1 items-center gap-2 min-w-0">
            <div className="bg-primary flex items-center justify-center rounded-full size-8 shrink-0">
              <Building2 className="size-4 text-primary-foreground" />
            </div>
            <p className="font-montserrat font-bold text-[16px] text-muted-foreground truncate">{quote.operator}</p>
          </div>
          <StatusBadge status={quote.status} bordered className="shrink-0" />
        </>
      }
    >
      <div className="flex items-start gap-4 w-full">
        <div className="flex flex-1 flex-col gap-1.5 items-start min-w-0 border-b border-secondary pb-2 text-[14px]">
          {isAwaiting && quote.aircraft === "—" ? (
            <p className="font-montserrat font-normal text-muted-foreground w-full truncate">
              {quote.suggestedAircraft && quote.suggestedAircraft !== "—"
                ? `Suggested: ${quote.suggestedAircraft}`
                : "Awaiting aircraft details"}
            </p>
          ) : (
            <p className="font-montserrat font-normal text-muted-foreground w-full truncate">
              {quote.aircraft}
            </p>
          )}

          {isAwaiting && !quote.rawPrice ? (
            <p className="font-montserrat font-medium text-[13px] text-muted-foreground italic">
              Awaiting operator pricing
            </p>
          ) : (
            <p className="font-montserrat font-bold text-success">{quote.price}</p>
          )}

          <p className="font-montserrat font-normal text-[12px] text-muted-foreground w-full truncate">
            {quote.amenities?.length
              ? quote.amenities.join(" · ")
              : isAwaiting
                ? "Amenities on response"
                : "—"}
          </p>
        </div>
        <div className="flex items-center gap-2 self-stretch shrink-0 border-b border-secondary pb-2">
          <Clock className="size-4 text-muted-foreground" />
          <p className="font-montserrat font-normal text-[14px] text-muted-foreground whitespace-nowrap">
            {isAwaiting && quote.responseTime === "—" ? (
              <span className="italic text-[13px]">Pending</span>
            ) : (
              quote.responseTime
            )}
          </p>
        </div>
      </div>

      {/* Hidden, not disabled, for a role that cannot act — a greyed-out pair
          of buttons invites a click and explains nothing. */}
      {mayWrite && (
        <div className="flex gap-2 items-center w-full">
          {isDecided ? (
            /* A settled quote shows the way back instead of two dead buttons.
               Without this a mis-click on Approve is unfixable from the
               screen, because both buttons disable the moment it lands. */
            <button
              type="button"
              disabled={isDeciding}
              onClick={onReopen}
              className={cn(
                "flex flex-1 gap-2 items-center justify-center px-4 py-2 rounded-sm border border-border bg-secondary/40 font-montserrat font-medium text-[14px] text-foreground cursor-pointer",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              <RotateCcw className="size-4" />
              Undo decision
            </button>
          ) : isAwaiting ? (
            <>
              <button
                type="button"
                onClick={onRecordResponse}
                className={cn(
                  "flex flex-1 gap-2 items-center justify-center px-4 py-2 rounded-sm border border-purple bg-purple/10 font-montserrat font-medium text-[14px] text-purple cursor-pointer hover:bg-purple/20 transition-colors",
                )}
              >
                <Edit3 className="size-4" />
                Record response
              </button>
              <button
                type="button"
                disabled={isDeciding}
                onClick={onDecline}
                title="Mark operator as declined"
                className={cn(
                  "flex gap-1.5 items-center justify-center px-3 py-2 rounded-sm border border-border bg-secondary/40 font-montserrat font-medium text-[13px] text-muted-foreground cursor-pointer hover:text-destructive transition-colors",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                <Ban className="size-3.5" />
                Decline
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={isDeciding}
                onClick={onApprove}
                className={cn(
                  "flex flex-1 gap-2 items-center justify-center px-4 py-2 rounded-sm border border-success bg-success/10 font-montserrat font-medium text-[14px] text-success cursor-pointer hover:bg-success/20 transition-colors",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                <Check className="size-4" />
                Approve
              </button>
              <button
                type="button"
                disabled={isDeciding}
                onClick={onReject}
                className={cn(
                  "flex flex-1 gap-2 items-center justify-center px-4 py-2 rounded-sm border border-destructive bg-destructive/10 font-montserrat font-medium text-[14px] text-destructive cursor-pointer hover:bg-destructive/20 transition-colors",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                <XCircle className="size-4" />
                Reject
              </button>
              <button
                type="button"
                onClick={onRecordResponse}
                title="Edit response details"
                className="flex items-center justify-center p-2 rounded-sm border border-border bg-secondary/40 hover:bg-secondary cursor-pointer text-muted-foreground transition-colors"
              >
                <Edit3 className="size-4" />
              </button>
            </>
          )}
        </div>
      )}
    </SectionCard>
  );
}
