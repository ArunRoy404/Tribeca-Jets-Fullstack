"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import CommonCard from "@/components/common/CommonCard";
import SectionHeader from "@/components/common/SectionHeader";
import TableStatus from "@/components/table/common/TableStatus";
import ReferralCard from "@/components/table/referrals/ReferralCard";
import { useReferrals } from "@/hooks/referrals";
import { toReferralRow } from "@/lib/referral";

const RECENT = { page: 1, limit: 4, sortBy: "createdAt", sortOrder: "desc" };

/** The agent's four newest referrals, each opening in My Referrals. */
export default function RecentReferrals() {
  const router = useRouter();
  const { data, isPending, error, refetch } = useReferrals(RECENT);
  const rows = useMemo(() => (data?.data ?? []).map(toReferralRow), [data?.data]);
  const isEmpty = !isPending && !error && rows.length === 0;

  return (
    <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
      <SectionHeader title="Recent Referrals" />
      {isPending || error || isEmpty ? (
        <TableStatus
          isLoading={isPending}
          error={error}
          isEmpty={isEmpty}
          emptyMessage="No referrals yet"
          emptyHint="Submit your first referral and follow its progress here."
          onRetry={refetch}
        />
      ) : (
        <div className="flex flex-col gap-3 p-4 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {rows.map((row) => (
              <ReferralCard
                key={row.id}
                item={row}
                showAgent={false}
                onClick={() => router.push(`/portal/referrals?referral=${row.id}`)}
              />
            ))}
          </div>
          <Link
            href="/portal/referrals"
            className="inline-flex items-center gap-1.5 self-end font-montserrat text-[13px] font-semibold text-purple hover:underline"
          >
            All my referrals
            <ArrowRight className="size-4" />
          </Link>
        </div>
      )}
    </CommonCard>
  );
}
