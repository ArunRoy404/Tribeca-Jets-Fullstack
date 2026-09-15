"use client";

import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { useOperatorSourcingStore } from "@/store/useOperatorSourcingStore";
import { trips } from "@/dummyData/trips";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/common/StatusBadge";
import DetailField from "@/components/common/DetailField";
import SectionCard from "@/components/common/SectionCard";
import FlightRouteStrip from "@/components/common/FlightRouteStrip";
import QuoteCard from "@/components/operator-sourcing/QuoteCard";

function normalizeId(id) {
  return String(id).replace("#", "").toUpperCase();
}

export default function SourcingRequestDetailSheet() {
  const router = useRouter();
  const selectedRequestId = useOperatorSourcingStore((s) => s.selectedRequestId);
  const closeRequestDetail = useOperatorSourcingStore((s) => s.closeRequestDetail);
  const getRequestById = useOperatorSourcingStore((s) => s.getRequestById);
  const openQuoteRequest = useOperatorSourcingStore((s) => s.openQuoteRequest);
  const setQuoteStatus = useOperatorSourcingStore((s) => s.setQuoteStatus);

  const request = selectedRequestId ? getRequestById(selectedRequestId) : null;
  const linkedTrip = request ? trips.find((t) => normalizeId(t.id) === normalizeId(request.id)) : null;
  const quotes = request?.quotes ?? [];

  return (
    <Sheet open={!!request} onOpenChange={(open) => !open && closeRequestDetail()}>
      <SheetContent className="data-[side=right]:w-full sm:data-[side=right]:max-w-175 gap-4 p-6 overflow-y-auto">
        {request && (
          <>
            <div className="border-b border-secondary flex items-start justify-between pb-4 w-full">
              <div className="flex flex-col gap-2 items-start">
                <div className="flex gap-2 items-center">
                  <p className="font-montserrat font-bold text-[20px] text-black-text">{request.id}</p>
                  <StatusBadge status={request.status} bordered />
                </div>
                <p className="font-montserrat font-normal text-[12px] text-muted-foreground">{request.client}</p>
              </div>
            </div>

            <FlightRouteStrip
              from={request.from}
              to={request.to}
              departureLabel={request.departureTime}
              arrivalLabel={request.arrivalTime}
              duration={request.duration}
            />

            <SectionCard>
              <div className="flex gap-4 w-full">
                <DetailField label="BUDGET" value={request.budget} labelClassName="text-[14px]" />
                <DetailField label="AIRCRAFT" value={request.aircraftNeeded} labelClassName="text-[14px]" />
              </div>
              <div className="flex gap-4 w-full">
                <DetailField label="DEPARTURE" value={request.departure} labelClassName="text-[14px]" />
                <DetailField label="DEADLINE" value={request.deadline} labelClassName="text-[14px]" />
              </div>
            </SectionCard>

            <div className="flex items-center justify-between w-full">
              <p className="font-montserrat font-bold text-[16px] text-foreground">
                OPERATOR QUOTES RECIVED({quotes.length})
              </p>
              <button
                type="button"
                onClick={() => openQuoteRequest(request.id)}
                className="flex gap-1 items-center cursor-pointer"
              >
                <Send className="size-4 text-purple" />
                <p className="font-montserrat font-bold text-[12px] text-purple whitespace-nowrap">Request Quote</p>
              </button>
            </div>

            <div className="flex flex-col gap-4 items-start w-full">
              {quotes.map((quote) => (
                <QuoteCard
                  key={quote.id}
                  quote={quote}
                  onApprove={() => setQuoteStatus(request.id, quote.id, "Approved")}
                  onReject={() => setQuoteStatus(request.id, quote.id, "Rejected")}
                />
              ))}
              {quotes.length === 0 && (
                <p className="font-montserrat text-[12px] text-muted-foreground py-4 text-center w-full">
                  No operator quotes yet — send a request to get started.
                </p>
              )}
            </div>

            <SectionCard title="Notes" titleClassName="text-foreground">
              <p className="font-montserrat font-normal text-[14px] text-muted-foreground w-full">{request.notes}</p>
            </SectionCard>

            {linkedTrip && (
              <div className="border-t border-secondary flex flex-col items-start pt-4 w-full mt-auto">
                <Button className="w-full" onClick={() => router.push(`/dashboard/trips/${normalizeId(linkedTrip.id)}`)}>
                  View Trip Details
                </Button>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
