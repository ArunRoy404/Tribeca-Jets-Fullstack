"use client";

import DetailCard from "@/components/quotes/DetailCard";
import QuoteVersionItem from "./QuoteVersionItem";

export default function QuoteVersionsCard({ quote }) {
  if (!quote) return null;

  const versions = quote.versions || [
    {
      version: quote.version || "V1",
      amount: quote.totalPriceFormatted || (quote.totalPrice ? `$${Number(quote.totalPrice).toLocaleString()}` : "—"),
      note: "Initial Quote",
      date: quote.sentDate || "Aug 10",
      isCurrent: true,
    },
  ];

  return (
    <DetailCard title="Quote Versions">
      <div className="flex flex-col gap-3 w-full">
        {versions.map((ver, idx) => {
          const isLatest = idx === 0 || ver.isCurrent;
          return (
            <QuoteVersionItem
              key={idx}
              version={ver.version}
              amount={ver.amount}
              note={ver.note}
              date={ver.date}
              isLatest={isLatest}
            />
          );
        })}
      </div>
    </DetailCard>
  );
}
