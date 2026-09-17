"use client";

import DetailCard from "@/components/quotes/DetailCard";
import QuoteVersionItem from "./QuoteVersionItem";
import { useQuoteVersions } from "@/hooks/quotes";
import { toVersionRow } from "@/lib/quote";

/**
 * Every revision of the offer, newest first.
 *
 * The figures are read back exactly as they were written — a snapshot that
 * recalculates from today's tax rate is not a snapshot. So nothing here is
 * derived from the current quote, and a version whose amount differs from
 * today's total is telling the truth, not disagreeing with it.
 *
 * The card used to synthesise a single "V1 · Initial Quote" from the quote
 * itself whenever it had no history, which meant a repriced quote showed one
 * version and the wrong date.
 */
export default function QuoteVersionsCard({ quote }) {
  const { data, isPending, error } = useQuoteVersions(quote?.id);

  if (!quote) return null;

  const versions = (data ?? []).map((v) => toVersionRow(v, quote.rawVersion));

  return (
    <DetailCard title="Quote Versions">
      <div className="flex flex-col gap-3 w-full">
        {isPending && (
          <p className="font-montserrat text-[13px] text-muted-foreground">
            Loading history…
          </p>
        )}

        {error && (
          <p className="font-montserrat text-[13px] text-destructive">
            Could not load the version history.
          </p>
        )}

        {!isPending && !error && versions.length === 0 && (
          <p className="font-montserrat text-[13px] text-muted-foreground">
            No version history on record.
          </p>
        )}

        {versions.map((version) => (
          <QuoteVersionItem
            key={version.id}
            version={version.version}
            amount={version.amount}
            note={version.note}
            date={version.date}
            isLatest={version.isCurrent}
          />
        ))}
      </div>
    </DetailCard>
  );
}
