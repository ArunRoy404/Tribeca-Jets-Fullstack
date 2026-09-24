"use client";

import { formatMoneyExact } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * What the client has on account, above the ledger that produced it.
 *
 * `formatMoneyExact` and not `formatMoney`: a balance is an amount somebody is
 * owed, not a negotiated figure, and rounding $6,000.40 to "$6,000" means the
 * profile and the bank statement disagree by forty cents with nothing on
 * screen explaining why.
 *
 * Every figure comes from the API's summary. None of it is derived here from a
 * page of movements — a page is not the ledger, and a balance computed from
 * one would be confidently wrong the moment there were eleven entries.
 */
export default function ClientCreditSummary({ summary, isPending, className }) {
  const figures = [
    { label: "On account", value: summary?.balance, emphasis: true },
    { label: "Credited", value: summary?.credited },
    { label: "Used", value: summary?.applied },
  ];

  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4", className)}>
      {figures.map((figure) => (
        <div
          key={figure.label}
          className={cn(
            "flex flex-col gap-1 rounded-md border border-border bg-white p-3 sm:p-4",
            figure.emphasis && "col-span-2 sm:col-span-1 bg-secondary/40",
          )}
        >
          <span className="font-montserrat text-[11px] uppercase tracking-wide text-muted-foreground">
            {figure.label}
          </span>
          <span
            className={cn(
              "font-montserrat font-bold text-foreground",
              figure.emphasis ? "text-[20px] sm:text-[22px]" : "text-[14px] sm:text-[15px]",
            )}
          >
            {/* An em dash while it loads, never a zero — "$0.00 on account" is
                a statement of fact that happens not to be known yet. */}
            {isPending ? "—" : formatMoneyExact(figure.value)}
          </span>
        </div>
      ))}
    </div>
  );
}
