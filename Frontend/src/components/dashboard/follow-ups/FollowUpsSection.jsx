"use client";

import CommonCard from "@/components/common/CommonCard";
import SectionHeader from "@/components/common/SectionHeader";
import Reveal from "@/components/common/Reveal";
import TableStatus from "@/components/table/common/TableStatus";
import FollowUpItem from "@/components/dashboard/follow-ups/FollowUpItem";
import { useClients } from "@/hooks/clients";
import { queryPresets } from "@/config/query.config";
import { toClientRow } from "@/lib/client";

const DOTS = { OVERDUE: "bg-destructive", TODAY: "bg-warning", UPCOMING: "bg-muted-foreground" };

/**
 * The next follow-ups on the clients the caller may see, soonest first —
 * the clients list with `followUp=SCHEDULED`, not a copy of it.
 */
export default function FollowUpsSection({ revealDelay = 0 }) {
  const { data, isPending, error, refetch } = useClients(
    { followUp: "SCHEDULED", sortBy: "nextFollowUpAt", sortOrder: "asc", limit: 5 },
    queryPresets.live,
  );
  const followUps = (data?.data ?? []).map((client) => {
    const row = toClientRow(client);
    return {
      id: row?.id,
      dot: DOTS[row?.followUpWindow] ?? "bg-muted-foreground",
      name: row?.name,
      status: row?.followUpWindowLabel,
      note: row?.followUpNote || "No note",
      date: row?.nextFollowUpLabel,
      owner: row?.broker,
    };
  });
  const isEmpty = !isPending && !error && followUps.length === 0;

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <SectionHeader
          title="Upcoming Follow-ups"
          rightText="View all Follow-ups →"
          rightHref="/dashboard/leads-agents"
        />

        <div className="relative flex flex-col items-start w-full">
          {isPending || error || isEmpty ? (
            <TableStatus
              isLoading={isPending}
              error={error}
              isEmpty={isEmpty}
              emptyMessage="No follow-ups scheduled"
              emptyHint="Schedule one from a client or lead and it appears here."
              onRetry={refetch}
            />
          ) : (
            followUps.map((item, i) => (
              <FollowUpItem key={item?.id} item={item} isLast={i === followUps.length - 1} />
            ))
          )}
        </div>
      </CommonCard>
    </Reveal>
  );
}
