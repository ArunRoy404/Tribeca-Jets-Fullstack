"use client";

import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import { useReferralStats } from "@/hooks/referrals";
import { useCommissionStats } from "@/hooks/commissions";
import { formatMoneyExact } from "@/lib/money";

const DASH = "—";

/**
 * #11's referral figures for the signed-in agent: total submitted, active,
 * trips booked and completed trips. Counted by the API over the agent's own
 * referrals; a dash until they arrive, never a zero nobody measured.
 */
export function PortalReferralStats() {
  const { data } = useReferralStats();
  const count = (n) => (data ? String(n ?? 0) : DASH);

  return (
    <SimpleStatsRow
      gridClassName="grid grid-cols-2 lg:grid-cols-4"
      stats={[
        { label: "Referrals submitted", value: count(data?.total), tone: "foreground" },
        { label: "Active referrals", value: count(data?.active), tone: "info" },
        { label: "Trips booked", value: count(data?.booked), tone: "purple" },
        { label: "Completed trips", value: count(data?.completed), tone: "success" },
      ]}
    />
  );
}

/**
 * #11's commission figures: pending, total earned and total paid. Every sum
 * is the API's, in cents — the portal adds nothing up itself. A commission
 * whose value depends on a trip's final figures is not yet in any total, and
 * the line under the tiles says how many are waiting rather than hiding them.
 */
export function PortalCommissionStats() {
  const { data } = useCommissionStats();
  const money = (value) => (data ? formatMoneyExact(value ?? 0) : DASH);
  const waiting = data?.unvalued ?? 0;

  return (
    <div className="flex flex-col gap-2 w-full">
      <SimpleStatsRow
        gridClassName="grid grid-cols-2 lg:grid-cols-3"
        stats={[
          { label: "Pending commission", value: money(data?.pending), tone: "warning" },
          { label: "Total commission earned", value: money(data?.earnedToDate), tone: "info" },
          { label: "Total commission paid", value: money(data?.paid), tone: "success" },
        ]}
      />
      {waiting > 0 && (
        <p className="font-montserrat text-[12px] text-muted-foreground">
          {waiting} commission{waiting === 1 ? " is" : "s are"} waiting on the trip&apos;s final figures and not yet
          counted above.
        </p>
      )}
    </div>
  );
}
