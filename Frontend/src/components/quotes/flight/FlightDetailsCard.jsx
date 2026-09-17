"use client";

import Link from "next/link";
import DetailCard from "@/components/quotes/DetailCard";
import FlightDetailField from "./FlightDetailField";

export default function FlightDetailsCard({ quote }) {
  if (!quote) return null;

  return (
    <DetailCard title="Flight Details">
      <div className="rounded-lg border border-border/80 bg-white p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 w-full">
          <FlightDetailField label="Departure">
            <span>
              {quote.origin} · {quote.departure}
            </span>
          </FlightDetailField>

          {/* A quote with no return date is a one-way, which is a fact rather
              than a missing value. */}
          <FlightDetailField label="Return">
            <span>
              {quote.rawReturnDate
                ? `${quote.destination} · ${quote.returnDate}`
                : "One way"}
            </span>
          </FlightDetailField>

          <FlightDetailField label="Aircraft">
            <span>{quote.aircraft}</span>
          </FlightDetailField>

          <FlightDetailField label="Operator">
            {quote.tripRequestId ? (
              <Link
                href={`/dashboard/operator-sourcing?tripRequestId=${quote.tripRequestId}`}
                className="text-purple hover:underline"
              >
                {quote.operator}
              </Link>
            ) : (
              <span>{quote.operator}</span>
            )}
          </FlightDetailField>

          <FlightDetailField label="Passengers">
            <span>{quote.passengers}</span>
          </FlightDetailField>

          <FlightDetailField label="Broker">
            <span>{quote.broker}</span>
          </FlightDetailField>
        </div>

        {/* The seam with Operator Sourcing, shown rather than implied: this is
            the operator price the margin above is measured against. */}
        {quote.sourcedFrom && (
          <p className="pt-4 mt-4 border-t border-border/60 font-montserrat text-[12px] text-muted-foreground">
            Priced from {quote.sourcedFrom.operator}’s quote of{" "}
            <strong className="text-foreground">{quote.sourcedFrom.price}</strong>
          </p>
        )}
      </div>
    </DetailCard>
  );
}
