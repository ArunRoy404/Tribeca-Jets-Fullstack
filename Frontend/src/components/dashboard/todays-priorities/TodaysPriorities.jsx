"use client";

import { useRouter } from "next/navigation";
import CommonCard from "@/components/common/CommonCard";
import SectionHeader from "@/components/common/SectionHeader";
import Reveal from "@/components/common/Reveal";
import TableStatus from "@/components/table/common/TableStatus";
import PriorityItem from "@/components/dashboard/todays-priorities/PriorityItem";
import { useDashboardPriorities } from "@/hooks/dashboard";
import { toPriorityItem } from "@/lib/dashboard";
import { toISODate } from "@/lib/date";

const SHOWN = 6;

/**
 * Follow-ups, the caller's tasks, bills and expiring documents that are due — from
 * `/dashboard/priorities`, most overdue first. The count is everything due,
 * not just the rows shown; each row's View opens the record it is about.
 */
export default function TodaysPriorities({ revealDelay = 0 }) {
  const router = useRouter();
  const today = new Date();
  const { data, isPending, error, refetch } = useDashboardPriorities({ limit: SHOWN, on: toISODate(today) });
  const priorities = (data?.data ?? []).map(toPriorityItem);
  const isEmpty = !isPending && !error && priorities.length === 0;

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <SectionHeader
          title="Today's Priorities"
          badgeCount={data?.meta?.total ?? undefined}
          rightText={today.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        />

        <div className="relative flex flex-col items-start w-full">
          {isPending || error || isEmpty ? (
            <TableStatus
              isLoading={isPending}
              error={error}
              isEmpty={isEmpty}
              emptyMessage="Nothing due today"
              emptyHint="Follow-ups, tasks, bills and expiring documents appear here."
              onRetry={refetch}
            />
          ) : (
            priorities.map((item, i) => (
              <PriorityItem
                key={item?.id}
                item={{ ...item, actions: item?.href ? ["View"] : [] }}
                isLast={i === priorities.length - 1}
                onActionClick={() => item?.href && router.push(item.href)}
              />
            ))
          )}
        </div>
      </CommonCard>
    </Reveal>
  );
}
