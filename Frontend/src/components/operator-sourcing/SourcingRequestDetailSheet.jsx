"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { useOperatorSourcingStore } from "@/store/useOperatorSourcingStore";
import { useTripRequest } from "@/hooks/trip-requests";
import { useDecideQuote, useOperatorQuotes } from "@/hooks/operator-quotes";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Module, Action } from "@/lib/access";
import { toQuoteRow, toSourcingRow } from "@/lib/sourcing";
import DetailSheet from "@/components/common/DetailSheet";
import StatusBadge from "@/components/common/StatusBadge";
import DetailField from "@/components/common/DetailField";
import SectionCard from "@/components/common/SectionCard";
import FlightRouteStrip from "@/components/common/FlightRouteStrip";
import TableStatus from "@/components/table/common/TableStatus";
import QuoteCard from "@/components/operator-sourcing/QuoteCard";
import RecordResponseDialog from "@/components/operator-sourcing/RecordResponseDialog";
import ConfirmDialog from "@/components/common/ConfirmDialog";

/**
 * One enquiry, and every operator quote against it — the comparison view from
 * scope §6.9.
 *
 * The route strip shows departure and arrival **dates**, not times. The screen
 * was designed against dummy data that carried "10:00 AM", "1:05 PM" and a
 * "3h 05m" duration; a trip request records the day the client wants to fly,
 * not a schedule, and those three values are only known once an operator
 * quotes a specific tail. Inventing them here would put a departure time on
 * the board that nobody has agreed.
 */
export default function SourcingRequestDetailSheet() {
  const selectedRequestId = useOperatorSourcingStore((s) => s.selectedRequestId);
  const closeRequestDetail = useOperatorSourcingStore((s) => s.closeRequestDetail);
  const openQuoteRequest = useOperatorSourcingStore((s) => s.openQuoteRequest);

  const { canAccess } = usePermissions();
  const mayCreate = canAccess(Module.OPERATOR_SOURCING, Action.CREATE);
  const mayEdit = canAccess(Module.OPERATOR_SOURCING, Action.EDIT);

  const [recordingQuote, setRecordingQuote] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const { data, isPending, error, refetch } = useTripRequest(selectedRequestId, {
    enabled: Boolean(selectedRequestId),
  });
  const request = data ? toSourcingRow(data) : null;

  const quotesQuery = useOperatorQuotes(
    { tripRequestId: selectedRequestId, limit: 100 },
    { enabled: Boolean(selectedRequestId) },
  );
  const quotes = (quotesQuery.data?.data ?? []).map(toQuoteRow);

  const { mutate: decide, isPending: isDeciding } = useDecideQuote();

  const handleApprove = (quote) => {
    setConfirmDialog({
      title: `Approve ${quote.operator}?`,
      description: `Approving this quote will lock in ${quote.operator} for this flight and advance the trip request to Quoted. Only one quote can be approved per enquiry.`,
      confirmLabel: "Approve Quote",
      tone: "default",
      onConfirm: () => {
        decide({ id: quote.id, action: "approve" });
        setConfirmDialog(null);
      },
    });
  };

  const handleDecline = (quote) => {
    setConfirmDialog({
      title: `Record decline from ${quote.operator}?`,
      description: `This marks that ${quote.operator} has no availability for this flight. It counts as an answer towards their response rate.`,
      confirmLabel: "Record Decline",
      tone: "default",
      onConfirm: () => {
        decide({ id: quote.id, action: "decline" });
        setConfirmDialog(null);
      },
    });
  };

  const handleReject = (quote) => {
    setConfirmDialog({
      title: `Reject quote from ${quote.operator}?`,
      description: `This rules out this quote while keeping it in the comparison history and the operator's pricing scorecard.`,
      confirmLabel: "Reject Quote",
      tone: "destructive",
      onConfirm: () => {
        decide({ id: quote.id, action: "reject" });
        setConfirmDialog(null);
      },
    });
  };

  const handleReopen = (quote) => {
    decide({ id: quote.id, action: "reopen" });
  };

  return (
    <>
      <DetailSheet
        open={Boolean(selectedRequestId)}
        onOpenChange={(open) => !open && closeRequestDetail()}
        resetKey={selectedRequestId}
      >
        {(isPending || error) && (
          <TableStatus isLoading={isPending} error={error} onRetry={refetch} />
        )}

        {request && (
          <>
            <div className="border-b border-secondary flex items-start justify-between pb-4 w-full">
              <div className="flex flex-col gap-2 items-start">
                <div className="flex gap-2 items-center">
                  <p className="font-montserrat font-bold text-[20px] text-black-text">
                    {request.reference}
                  </p>
                  {request.stage !== "—" && (
                    <StatusBadge status={request.stage} bordered />
                  )}
                </div>
                <p className="font-montserrat font-normal text-[12px] text-muted-foreground">
                  {request.client}
                  {request.broker !== "Unassigned" && ` · ${request.broker}`}
                </p>
              </div>
            </div>

            <FlightRouteStrip
              from={request.from}
              to={request.to}
              departureLabel={request.departure}
            />

            <SectionCard>
              <div className="flex gap-4 w-full">
                <DetailField label="BUDGET" value={request.budget} labelClassName="text-[14px]" />
                <DetailField label="AIRCRAFT" value={request.aircraftNeeded} labelClassName="text-[14px]" />
              </div>
              <div className="flex gap-4 w-full">
                <DetailField label="DEPARTURE" value={request.departure} labelClassName="text-[14px]" />
                <DetailField label="QUOTE DEADLINE" value={request.deadline} labelClassName="text-[14px]" />
              </div>
              <div className="flex gap-4 w-full">
                <DetailField label="OPERATORS ASKED" value={String(request.operatorsContacted)} labelClassName="text-[14px]" />
                <DetailField label="BEST PRICE" value={request.bestPrice} labelClassName="text-[14px]" />
              </div>
            </SectionCard>

            <div className="flex items-center justify-between w-full">
              <p className="font-montserrat font-bold text-[16px] text-foreground">
                OPERATOR QUOTES ({quotes.length})
              </p>
              {/* Hidden rather than disabled for a role that cannot source. */}
              {mayCreate && !request.isArchived && (
                <button
                  type="button"
                  onClick={() => openQuoteRequest(request.id)}
                  className="flex gap-1 items-center cursor-pointer"
                >
                  <Send className="size-4 text-purple" />
                  <p className="font-montserrat font-bold text-[12px] text-purple whitespace-nowrap">
                    Ask an Operator
                  </p>
                </button>
              )}
            </div>

            <div className="flex flex-col gap-4 items-start w-full">
              {quotes.map((quote) => (
                <QuoteCard
                  key={quote.id}
                  quote={quote}
                  mayWrite={mayEdit}
                  isDeciding={isDeciding}
                  onApprove={() => handleApprove(quote)}
                  onReject={() => handleReject(quote)}
                  onDecline={() => handleDecline(quote)}
                  onRecordResponse={() => setRecordingQuote(quote)}
                  onReopen={() => handleReopen(quote)}
                />
              ))}
              {quotes.length === 0 && !quotesQuery.isPending && (
                <p className="font-montserrat text-[12px] text-muted-foreground py-4 text-center w-full">
                  No operator quotes yet — ask an operator to get started.
                </p>
              )}
            </div>

            {request.notes && (
              <SectionCard title="Requirements" titleClassName="text-foreground">
                <p className="font-montserrat font-normal text-[14px] text-muted-foreground w-full">
                  {request.notes}
                </p>
              </SectionCard>
            )}
          </>
        )}
      </DetailSheet>

      <RecordResponseDialog
        key={recordingQuote?.id}
        quote={recordingQuote}
        open={Boolean(recordingQuote)}
        onClose={() => setRecordingQuote(null)}
      />

      <ConfirmDialog
        open={Boolean(confirmDialog)}
        onOpenChange={(open) => !open && setConfirmDialog(null)}
        title={confirmDialog?.title ?? ""}
        description={confirmDialog?.description ?? ""}
        confirmLabel={confirmDialog?.confirmLabel ?? "Confirm"}
        tone={confirmDialog?.tone ?? "default"}
        onConfirm={confirmDialog?.onConfirm}
      />
    </>
  );
}
