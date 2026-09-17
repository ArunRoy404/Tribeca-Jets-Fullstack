"use client";

import Link from "next/link";
import DetailCard from "@/components/quotes/DetailCard";
import FlightDetailField from "./FlightDetailField";

export default function FlightDetailsCard({ quote }) {
  if (!quote) return null;

  const origin = quote.origin || quote.departureAirport || "—";
  const departureDate = quote.date || quote.departureDate || "—";
  const destination = quote.destination || quote.destinationAirport || "—";
  const returnDate = quote.returnDate || "—";
  const aircraft = quote.aircraft || "—";
  const operator = quote.operator || "—";

  return (
    <DetailCard title="Flight Details">
      <div className="rounded-lg border border-border/80 bg-white p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 w-full">
          {/* Departure */}
          <FlightDetailField label="Departure">
            <span>{origin} · {departureDate}</span>
          </FlightDetailField>

          {/* Return */}
          <FlightDetailField label="Return">
            <span>{destination} · {returnDate}</span>
          </FlightDetailField>

          {/* Aircraft */}
          <FlightDetailField label="Aircraft">
            <span>{aircraft}</span>
          </FlightDetailField>

          {/* Operator */}
          <FlightDetailField label="Operator">
            <Link
              href="/dashboard/operator-sourcing"
              className="text-purple hover:underline"
            >
              {operator}
            </Link>
          </FlightDetailField>
        </div>
      </div>
    </DetailCard>
  );
}
