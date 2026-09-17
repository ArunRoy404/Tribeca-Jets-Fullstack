"use client";

import DetailCard from "@/components/quotes/DetailCard";
import ProfitabilityRow from "./ProfitabilityRow";

/**
 * What the desk makes on this quote.
 *
 * Two different blanks, said differently. A caller without VIEW_FINANCIALS
 * gets no figures at all and is told why — three em dashes would read as
 * missing data and send someone looking for it. A quote whose operator cost is
 * not in yet shows the client price and an honest "Not priced yet" against the
 * rest: a margin of "we do not know" must never render as 100% profit.
 */
export default function QuoteProfitabilityCard({ quote }) {
  if (!quote) return null;

  if (!quote.hasFinancials) {
    return (
      <DetailCard title="Profitability">
        <p className="font-montserrat text-[13px] text-muted-foreground leading-relaxed">
          Margins are not part of your access. The client price is shown above.
        </p>
      </DetailCard>
    );
  }

  const unpriced = quote.rawOperatorCost === null;

  return (
    <DetailCard title="Profitability">
      <div className="flex flex-col gap-1 w-full">
        <ProfitabilityRow label="Client quote" value={quote.total} tone="success" />
        <ProfitabilityRow
          label="Operator cost"
          value={unpriced ? "Not priced yet" : quote.operatorCost}
          tone={unpriced ? "foreground" : "destructive"}
        />
        <ProfitabilityRow
          label="Gross profit"
          value={unpriced ? "—" : quote.grossProfit}
          tone="purple"
        />
        <ProfitabilityRow
          label="Margin"
          value={unpriced ? "—" : quote.margin}
          tone="foreground"
          isLast
        />
      </div>

      {unpriced && (
        <p className="pt-3 font-montserrat text-[12px] text-muted-foreground">
          Record what the operator charges to see the margin.
        </p>
      )}
    </DetailCard>
  );
}
