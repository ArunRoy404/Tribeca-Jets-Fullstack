"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import Reveal from "@/components/common/Reveal";
import { Button } from "@/components/ui/button";
import { PortalCommissionStats, PortalReferralStats } from "@/components/portal/PortalStats";
import RecentReferrals from "@/components/portal/RecentReferrals";
import { useCurrentUser } from "@/hooks/auth";
import { useBranding } from "@/hooks/settings";

/**
 * The partner portal's Dashboard (#11): the agent's own figures — referrals
 * submitted, active, trips booked, completed trips, pending commission, total
 * earned and total paid — and their newest referrals. Nothing on it is about
 * anyone else's clients, trips or money.
 */
export default function PortalDashboardPage() {
  const { data: me } = useCurrentUser();

  const { data: branding } = useBranding();

  return (
    <div className="flex flex-col gap-6 px-4 sm:px-6 py-6 pb-8">
      <Reveal className="w-full">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="font-montserrat font-bold text-[20px] sm:text-[24px] text-foreground">
              {me?.firstName ? `Welcome, ${me.firstName}` : "Welcome"}
            </h2>
            <p className="font-montserrat text-[13px] text-muted-foreground">
              {branding?.companyName
                ? `Your referrals and commissions with ${branding.companyName}.`
                : "Your referrals and commissions."}
            </p>
          </div>
          <Button render={<Link href="/portal/submit" />} nativeButton={false} className="gap-2">
            <Plus className="size-4" />
            Submit a referral
          </Button>
        </div>
      </Reveal>

      <section className="flex flex-col gap-3">
        <h3 className="font-montserrat font-semibold text-[15px] text-foreground">Referrals</h3>
        <PortalReferralStats />
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="font-montserrat font-semibold text-[15px] text-foreground">Commissions</h3>
        <PortalCommissionStats />
      </section>

      <Reveal className="w-full">
        <RecentReferrals />
      </Reveal>
    </div>
  );
}
