"use client";

export default function QuoteProfitabilityCard({ quote }) {
  return (
    <div className="flex flex-col gap-4 w-full rounded-lg border border-border bg-white p-5 sm:p-6 shadow-card">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h3 className="font-montserrat font-bold text-[16px] text-foreground">
          Profitability
        </h3>
      </div>

      <div className="flex flex-col gap-3.5 w-full">
        {/* Client Quote */}
        <div className="flex items-center justify-between gap-4 py-1 border-b border-border/30">
          <span className="font-montserrat text-[13px] text-muted-foreground">
            Client Quote
          </span>
          <span className="font-montserrat font-bold text-[14px] text-success">
            {quote.totalPriceFormatted}
          </span>
        </div>

        {/* Operator Cost */}
        <div className="flex items-center justify-between gap-4 py-1 border-b border-border/30">
          <span className="font-montserrat text-[13px] text-muted-foreground">
            Operator Cost
          </span>
          <span className="font-montserrat font-bold text-[14px] text-destructive">
            {quote.operatorCostFormatted}
          </span>
        </div>

        {/* Gross Profit */}
        <div className="flex items-center justify-between gap-4 py-1 border-b border-border/30">
          <span className="font-montserrat text-[13px] text-muted-foreground">
            Gross Profit
          </span>
          <span className="font-montserrat font-bold text-[14px] text-purple">
            {quote.grossProfitFormatted}
          </span>
        </div>

        {/* Margin */}
        <div className="flex items-center justify-between gap-4 py-1">
          <span className="font-montserrat text-[13px] text-muted-foreground">
            Margin
          </span>
          <span className="font-montserrat font-bold text-[15px] text-foreground">
            {quote.marginPercentage}
          </span>
        </div>
      </div>
    </div>
  );
}

