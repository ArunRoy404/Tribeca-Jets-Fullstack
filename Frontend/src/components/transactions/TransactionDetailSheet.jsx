"use client";

import Link from "next/link";
import { ArrowRight, ExternalLink, Plane, Receipt } from "lucide-react";
import DetailSheet from "@/components/common/DetailSheet";
import DetailField from "@/components/common/DetailField";
import SectionCard from "@/components/common/SectionCard";
import StatusBadge from "@/components/common/StatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Slide-over detail drawer for one money movement.
 * Displays movement facts without navigating away from the Transactions ledger,
 * providing a redirect CTA to the origin bill/invoice/commission in its owning module.
 */
export default function TransactionDetailSheet({ item, onClose }) {
  if (!item) return null;

  const targetLabel =
    item.rawKind === "CLIENT_PAYMENT"
      ? "Open Invoice in Receivables"
      : item.rawKind === "OPERATOR_PAYMENT"
        ? "Open Bill in Operator Payments"
        : "Open Commission in Commissions";

  return (
    <DetailSheet open={Boolean(item)} onOpenChange={(open) => !open && onClose?.()} resetKey={item?.id}>
      <div className="border-b border-secondary flex items-start justify-between pb-4 w-full">
        <div className="flex flex-col gap-2 items-start">
          <div className="flex flex-wrap gap-2 items-center">
            <p className="font-montserrat font-bold text-[20px] text-foreground">{item.counterparty}</p>
            <StatusBadge status={item.kind} bordered />
          </div>
          <p className="font-montserrat text-[12px] text-muted-foreground">
            {item.document} · Recorded on {item.date}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 w-full">
        <SectionCard title="Payment Movement">
          <div className="flex flex-col gap-1 pb-2 border-b border-secondary">
            <span className="font-montserrat text-[12px] text-muted-foreground">Movement Amount</span>
            <span
              className={cn(
                "font-montserrat font-bold text-[24px]",
                !item.known ? "text-muted-foreground" : item.incoming ? "text-success" : "text-destructive"
              )}
            >
              {item.amount}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full">
            <DetailField
              label="Direction"
              value={item.incoming ? "IN (Payment Received)" : "OUT (Disbursement)"}
            />
            <DetailField label="Date" value={item.date} />
            <DetailField label="Payment Method" value={item.method} />
            <DetailField label="Reference Number" value={item.reference} />
          </div>
        </SectionCard>

        <SectionCard title="Associated Bill & Trip">
          <div className="grid grid-cols-2 gap-4 w-full">
            <DetailField label="Settled Bill / Document" value={item.document} />
            <DetailField label="Trip Reference" value={item.tripReference} />
            <DetailField label="Assigned Broker" value={item.broker} />
            <DetailField label="Movement Kind" value={item.kind} />
          </div>
        </SectionCard>

        <SectionCard title="Actions & Navigation">
          <div className="flex flex-col gap-2.5 w-full">
            {item.href && (
              <Link
                href={item.href}
                className={cn(
                  buttonVariants({ variant: "default" }),
                  "w-full h-10 px-3.5 flex items-center justify-between gap-2.5 font-montserrat font-semibold text-[13px] no-underline cursor-pointer"
                )}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Receipt className="size-4 shrink-0" />
                  <span className="truncate">{targetLabel}</span>
                </span>
                <ExternalLink className="size-3.5 shrink-0 opacity-70" />
              </Link>
            )}

            {item.tripId && (
              <Link
                href={`/dashboard/trips/${item.tripId}`}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "w-full h-10 px-3.5 flex items-center justify-between gap-2.5 font-montserrat font-medium text-[13px] no-underline cursor-pointer"
                )}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Plane className="size-4 shrink-0" />
                  <span className="truncate">View Trip ({item.tripReference})</span>
                </span>
                <ArrowRight className="size-3.5 shrink-0 opacity-70" />
              </Link>
            )}
          </div>
        </SectionCard>
      </div>
    </DetailSheet>
  );
}
