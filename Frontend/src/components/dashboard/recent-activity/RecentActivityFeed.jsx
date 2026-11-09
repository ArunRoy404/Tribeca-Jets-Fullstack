"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import CommonCard from "@/components/common/CommonCard";
import Reveal from "@/components/common/Reveal";
import TableStatus from "@/components/table/common/TableStatus";
import ActivityItem from "@/components/dashboard/recent-activity/ActivityItem";
import { useDashboardActivity } from "@/hooks/dashboard";
import { useUsers } from "@/hooks/users";
import { toActivityItem } from "@/lib/dashboard";

const SHOWN = 6;

/**
 * The newest entries of the audit trail the caller may read, from
 * `/dashboard/activity`. Supports filtering by user/broker (Feedback 2.3).
 * Refresh refetches; the list also refreshes itself.
 */
export default function RecentActivityFeed({ revealDelay = 0 }) {
  const [selectedUserId, setSelectedUserId] = useState("");
  const { data: usersData } = useUsers({ limit: 100 });

  const userOptions = useMemo(() => {
    return (usersData?.data ?? [])
      .map((u) => ({
        id: u.id,
        name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email,
        role: u.role,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [usersData?.data]);

  const activityParams = useMemo(() => ({
    limit: SHOWN,
    ...(selectedUserId ? { userId: selectedUserId } : {}),
  }), [selectedUserId]);

  const { data, isPending, isFetching, error, refetch } = useDashboardActivity(activityParams);
  const activity = (data?.data ?? []).map(toActivityItem);
  const isEmpty = !isPending && !error && activity.length === 0;

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <div className="relative flex items-center justify-between p-4 w-full bg-sidebar border-b border-border/40 gap-2">
          <div className="flex gap-2 items-center min-w-0">
            <p className="font-montserrat font-bold text-[16px] text-white whitespace-nowrap truncate">
              Recent Activity
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="bg-card text-xs text-white border border-border/80 rounded px-2.5 py-1 outline-none focus:border-purple cursor-pointer max-w-[160px] truncate"
              title="Filter activity by team member"
            >
              <option value="">All Team Members</option>
              {userOptions.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => !isFetching && refetch()}
              className="flex items-center justify-center p-1 rounded size-6 cursor-pointer hover:bg-white/10 shrink-0 text-muted-foreground hover:text-white"
              title="Refresh activity"
            >
              <Image src="/dashboard/icons/refresh.svg" alt="Refresh" width={14} height={14} />
            </button>
          </div>
        </div>

        <div className="relative flex flex-col items-start w-full">
          {isPending || error || isEmpty ? (
            <TableStatus
              isLoading={isPending}
              error={error}
              isEmpty={isEmpty}
              emptyMessage={selectedUserId ? "No activity for this team member" : "No activity yet"}
              emptyHint={selectedUserId ? "Activities made by this user will appear here." : "Changes to trips, clients and bills appear here as they happen."}
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
