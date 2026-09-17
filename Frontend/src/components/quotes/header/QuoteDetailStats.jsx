"use client";

import StatCard from "@/components/common/StatCard";
import { ArrowRight } from "lucide-react";

export default function QuoteDetailStats({ quote }) {
  if (!quote) return null;

  const clientName = (quote.client || "—").toUpperCase();
  const origin = quote.origin || quote.departureAirport || "—";
  const destination = quote.destination || quote.destinationAirport || "—";
  const aircraft = (quote.aircraft || "—").toUpperCase();
  const totalPrice = quote.totalPriceFormatted || (quote.totalPrice ? `$${Number(quote.totalPrice).toLocaleString()}` : "—");
  const expiry = quote.expiryDate || "—";

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 items-stretch justify-center w-full">
      {/* 1. Client */}
      <StatCard
        title="CLIENT"
        value={clientName}
      />

      {/* 2. Route */}
      <StatCard
        title="ROUTE"
        value={
          <span className="flex items-center gap-1.5 text-foreground">
            <span>{origin}</span>
            <ArrowRight className="size-3.5 text-muted-foreground shrink-0" />
            <span>{destination}</span>
          </span>
        }
      />

      {/* 3. Aircraft */}
      <StatCard
        title="AIRCRAFT"
        value={aircraft}
      />

      {/* 4. Total Price */}
      <StatCard
        title="TOTAL PRICE"
        value={totalPrice}
        valueTone="success"
      />

      {/* 5. Expiry */}
      <StatCard
        title="EXPIRY"
        value={expiry}
        className="col-span-2 sm:col-span-1"
      />
    </div>
  );
}
