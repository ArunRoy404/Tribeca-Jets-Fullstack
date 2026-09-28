"use client";

import CommonCard from "@/components/common/CommonCard";
import SectionHeader from "@/components/common/SectionHeader";
import Reveal from "@/components/common/Reveal";
import TableStatus from "@/components/table/common/TableStatus";
import ActivityItem from "@/components/dashboard/recent-activity/ActivityItem";
import { useDashboardActivity } from "@/hooks/dashboard";
import { toActivityItem } from "@/lib/dashboard";

const SHOWN = 6;

/**
 * The newest entries of the audit trail the caller may read, from
 * `/dashboard/activity`. Refresh refetches; the list also refreshes itself.
 */
export default function RecentActivityFeed({ revealDelay = 0 }) {
  const { data, isPending, isFetching, error, refetch } = useDashboardActivity({ limit: SHOWN });
  const activity = (data?.data ?? []).map(toActivityItem);
  const isEmpty = !isPending && !error && activity.length === 0;

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <SectionHeader
          title="Recent Activity"
          rightIcon="/dashboard/icons/refresh.svg"
          onRightClick={() => !isFetching && refetch()}
        />

        <div className="relative flex flex-col items-start w-full">
          {isPending || error || isEmpty ? (
            <TableStatus
              isLoading={isPending}
              error={error}
              isEmpty={isEmpty}
              emptyMessage="No activity yet"
              emptyHint="Changes to trips, clients and bills appear here as they happen."
              onRetry={refetch}
            />
          ) : (
            activity.map((item, i) => (
              <ActivityItem key={item?.id} item={item} isLast={i === activity.length - 1} />
            ))
          )}
        </div>
      </CommonCard>
    </Reveal>
  );
}
