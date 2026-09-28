"use client";

import SuccessCard from "@/components/auth/SuccessCard";
import { useCurrentUser } from "@/hooks/auth";
import { homeFor, isPartnerRole } from "@/lib/roles";

/**
 * The last step of a two-factor sign-in. Where it continues to depends on who
 * signed in: a referral agent's home is the partner portal, never the CRM.
 * The user was seeded into the cache by the verify step, so this reads it
 * without a request.
 */
export default function SignInCompletePage() {
  const { data: user } = useCurrentUser();
  const partner = isPartnerRole(user?.role);

  return (
    <SuccessCard
      title="You’re all set"
      description={
        partner
          ? "Your Tribeca Jets referral partner account is verified and ready to go."
          : "Your Tribeca Jets Command Center account is verified and ready to go."
      }
      ctaLabel={partner ? "Continue to Referral Portal" : "Continue to Dashboard"}
      ctaHref={homeFor(user?.role)}
    />
  );
}
