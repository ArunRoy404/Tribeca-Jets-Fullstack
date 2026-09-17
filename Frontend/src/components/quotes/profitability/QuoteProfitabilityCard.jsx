"use client";

import DetailCard from "@/components/quotes/DetailCard";
import ProfitabilityRow from "./ProfitabilityRow";

export default function QuoteProfitabilityCard({ quote }) {
  if (!quote) return null;

  const clientQuote = quote.totalPriceFormatted || (quote.totalPrice ? `$${Number(quote.totalPrice).toLocaleString()}` : "—");
  const operatorCost = quote.operatorCostFormatted || (quote.operatorCost ? `$${Number(quote.operatorCost).toLocaleString()}` : "—");
  const grossProfit = quote.grossProfitFormatted || (quote.grossProfit ? `$${Number(quote.grossProfit).toLocaleString()}` : "—");
  const margin = quote.marginPercentage || (quote.margin ? `${quote.margin}%` : "—");

  return (
    <DetailCard title="Profitability">
      <div className="flex flex-col gap-1 w-full">
        <ProfitabilityRow
          label="Client Quote"
          value={clientQuote}
          tone="success"
        />
        <ProfitabilityRow
          label="Operator Cost"
          value={operatorCost}
          tone="destructive"
        />
        <ProfitabilityRow
          label="Gross Profit"
          value={grossProfit}
          tone="purple"
        />
        <ProfitabilityRow
          label="Margin"
          value={margin}
          tone="foreground"
          isLast
        />
      </div>
    </DetailCard>
  );
}
