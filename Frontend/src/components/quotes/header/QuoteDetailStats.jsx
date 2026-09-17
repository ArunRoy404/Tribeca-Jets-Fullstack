"use client";

import StatCard from "@/components/common/StatCard";
import { ArrowRight } from "lucide-react";

export default function QuoteDetailStats({ quote }) {
  if (!quote) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 items-stretch justify-center w-full">
      <StatCard title="CLIENT" value={quote.client} />

      <StatCard
        title="ROUTE"
        value={
          <span className="flex items-center gap-1.5 text-foreground">
            <span>{quote.origin}</span>
            <ArrowRight className="size-3.5 text-muted-foreground shrink-0" />
            <span>{quote.destination}</span>
          </span>
        }
      />

      <StatCard title="AIRCRAFT" value={quote.aircraft} />

      <StatCard title="TOTAL PRICE" value={quote.total} valueTone="success" />

      {/* The expiry earns its warning from a date the API compared today,
          never from a stored flag that would be stale between writes. */}
      <StatCard
        title={quote.isExpired ? "EXPIRED" : "VALID UNTIL"}
        value={quote.expiry}
        valueTone={quote.isExpired ? "destructive" : undefined}
        className="col-span-2 sm:col-span-1"
      />
    </div>
  );
}
