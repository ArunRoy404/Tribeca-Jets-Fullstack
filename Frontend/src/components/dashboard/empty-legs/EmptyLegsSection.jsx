"use client";

import CommonCard from "@/components/common/CommonCard";
import SectionHeader from "@/components/common/SectionHeader";
import Reveal from "@/components/common/Reveal";
import TableStatus from "@/components/table/common/TableStatus";
import EmptyLegCard from "@/components/dashboard/empty-legs/EmptyLegCard";
import { useEmptyLegs } from "@/hooks/empty-legs";
import { toEmptyLegRow } from "@/lib/emptyLeg";

/**
 * The next few empty legs still on offer, soonest first, each with its match
 * count (#10b). Live since Empty Legs shipped; the four hardcoded Miami and
 * Teterboro legs this used to show are gone.
 */
export default function EmptyLegsSection({ revealDelay = 0 }) {
  const { data, isPending, error, refetch } = useEmptyLegs({
    status: "AVAILABLE",
    limit: 4,
    sortBy: "departureDate",
    sortOrder: "asc",
  });
  const legs = (data?.data ?? []).map(toEmptyLegRow);
  const isEmpty = !isPending && !error && legs.length === 0;

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <SectionHeader title="Empty Leg Opportunities" rightText="View All →" rightHref="/dashboard/empty-legs" />

        <div className="relative flex flex-col gap-2 items-start p-4 w-full">
          {isPending || error || isEmpty ? (
            <TableStatus
              isLoading={isPending}
              error={error}
              isEmpty={isEmpty}
              emptyMessage="No empty legs on offer"
              emptyHint="Add an operator's empty leg and its matches appear here."
              onRetry={refetch}
            />
          ) : (
            legs.map((leg) => <EmptyLegCard key={leg.id} leg={leg} />)
          )}
        </div>
      </CommonCard>
    </Reveal>
  );
}
