"use client";

import DetailCard from "@/components/quotes/DetailCard";
import QuoteBreakdownRow from "./QuoteBreakdownRow";
import QuoteBreakdownTotal from "./QuoteBreakdownTotal";

/**
 * What the client is being charged, line by line.
 *
 * The base price and the tax are always shown because they always exist; the
 * extras are whatever the quote actually carries. This card used to invent
 * "Catering (Seafood Premium)" and "Ground Transportation" as Included
 * whenever a quote had no line items — so every quote in the system appeared
 * to include catering nobody had agreed to supply.
 */
export default function QuoteBreakdownCard({ quote }) {
  if (!quote) return null;

  return (
    <DetailCard title="Quote Breakdown">
      <div className="flex flex-col gap-1 w-full">
        <QuoteBreakdownRow label="Base charter price" amount={quote.basePrice} />

        <QuoteBreakdownRow
          label={
            quote.fetEnabled
              ? `Federal Excise Tax (${quote.fetRateLabel})`
              : "Federal Excise Tax"
          }
          amount={quote.fet}
          type={quote.fetEnabled ? "currency" : "text"}
        />

        {quote.lineItems?.map((item, index) => (
          <QuoteBreakdownRow
            key={`${item.label}-${index}`}
            label={item.label}
            amount={item.amount}
            type={item.type}
          />
        ))}

        <QuoteBreakdownTotal total={quote.total} />

        {quote.rawDeposit !== null && (
          <p className="pt-2 font-montserrat text-[12px] text-muted-foreground">
            Deposit due on acceptance: <strong>{quote.deposit}</strong>
          </p>
        )}
      </div>
    </DetailCard>
  );
}
