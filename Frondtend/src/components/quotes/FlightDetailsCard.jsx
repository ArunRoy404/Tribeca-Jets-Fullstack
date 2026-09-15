"use client";

import Link from "next/link";

export default function FlightDetailsCard({ quote }) {
  return (
    <div className="flex flex-col gap-4 w-full rounded-lg border border-border bg-white p-5 sm:p-6 shadow-card">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h3 className="font-montserrat font-bold text-[16px] text-foreground">
          Flight Details
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        {/* Departure */}
        <div className="flex flex-col gap-1 p-3 rounded-md bg-secondary/30">
          <span className="font-montserrat text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Departure
          </span>
          <span className="font-montserrat font-bold text-[14px] text-foreground">
            {quote.origin} • {quote.date}
          </span>
        </div>

        {/* Return */}
        <div className="flex flex-col gap-1 p-3 rounded-md bg-secondary/30">
          <span className="font-montserrat text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Return
          </span>
          <span className="font-montserrat font-bold text-[14px] text-foreground">
            {quote.destination} • {quote.returnDate || "Aug 18"}
          </span>
        </div>

        {/* Aircraft */}
        <div className="flex flex-col gap-1 p-3 rounded-md bg-secondary/30">
          <span className="font-montserrat text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Aircraft
          </span>
          <span className="font-montserrat font-bold text-[14px] text-foreground">
            {quote.aircraft}
          </span>
        </div>

        {/* Operator */}
        <div className="flex flex-col gap-1 p-3 rounded-md bg-secondary/30">
          <span className="font-montserrat text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Operator
          </span>
          <Link
            href="/dashboard/operator-sourcing"
            className="font-montserrat font-bold text-[14px] text-purple hover:underline"
          >
            {quote.operator}
          </Link>
        </div>
      </div>
    </div>
  );
}

