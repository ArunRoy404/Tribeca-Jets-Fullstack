"use client";

import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import { useReferralStats } from "@/hooks/referrals";

/** The desk's referral counts, within the caller's scope. */
export default function ReferralsStats() {
  const { data } = useReferralStats();
  const value = (n) => (data ? String(n ?? 0) : "—");

  const stats = [
    { label: "NEW", value: value(data?.submitted), tone: "info" },
    { label: "ACTIVE", value: value(data?.active), tone: "warning" },
    { label: "BOOKED", value: value(data?.booked), tone: "success" },
    { label: "COMPLETED", value: value(data?.completed), tone: "success" },
    { label: "LOST / CANCELLED", value: value(data?.lost), tone: "foreground" },
    { label: "TOTAL", value: value(data?.total), tone: "foreground" },
  ];

  return <SimpleStatsRow stats={stats} />;
}
