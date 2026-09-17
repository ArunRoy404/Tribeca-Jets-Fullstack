"use client";

import DetailCard from "@/components/quotes/DetailCard";
import QuoteBreakdownRow from "./QuoteBreakdownRow";
import QuoteBreakdownTotal from "./QuoteBreakdownTotal";

export default function QuoteBreakdownCard({ quote }) {
  if (!quote) return null;

  const lineItems = quote.lineItems || [
    { label: "Base Charter Price", amount: quote.basePriceFormatted || `$${Number(quote.basePrice || 0).toLocaleString()}`, type: "currency" },
    ...(quote.fetEnabled
      ? [{ label: "Federal Excise Tax (7.5%)", amount: quote.fetFormatted || `$${Number(quote.fetAmount || 0).toLocaleString()}`, type: "currency" }]
      : []),
    { label: "Catering (Seafood Premium)", amount: "Included", type: "text" },
    { label: "Ground Transportation", amount: "Included", type: "text" },
  ];

  const totalPrice = quote.totalPriceFormatted || (quote.totalPrice ? `$${Number(quote.totalPrice).toLocaleString()}` : "—");

  return (
    <DetailCard title="Quote Breakdown">
      <div className="flex flex-col gap-1 w-full">
        {lineItems.map((item, idx) => (
          <QuoteBreakdownRow
            key={idx}
            label={item.label}
            amount={item.amount}
            type={item.type}
          />
        ))}

        <QuoteBreakdownTotal total={totalPrice} />
      </div>
    </DetailCard>
  );
}
