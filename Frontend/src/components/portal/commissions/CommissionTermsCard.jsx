"use client";

import { Handshake } from "lucide-react";
import CommonCard from "@/components/common/CommonCard";
import { useCurrentUser } from "@/hooks/auth";
import { formatStructure } from "@/lib/commission";

/**
 * The agent's own standing commission terms, as the desk set them (#11:
 * "Admin should be able to assign a different commission structure to each
 * referral agent"). Their agreement, so theirs to read; it arrives with the
 * session. A commission can still be set differently on a particular trip —
 * each row in the list says what applies to it.
 */
export default function CommissionTermsCard() {
  const { data: me } = useCurrentUser();
  const terms = me?.commissionTerms ?? null;

  return (
    <CommonCard variant="default" className="flex items-start gap-3 p-4 rounded-md border-border w-full">
      <Handshake className="size-5 text-purple shrink-0 mt-0.5" />
      <div className="flex flex-col gap-1 min-w-0">
        <p className="font-montserrat text-[12px] text-muted-foreground">Your standard commission</p>
        <p className="font-montserrat font-bold text-[16px] text-foreground">
          {terms ? formatStructure(terms) : "Not set yet"}
        </p>
        <p className="font-montserrat text-[12px] text-muted-foreground">
          {terms
            ? "Applied to each trip your referrals book, unless the Tribeca team agrees different terms for that trip."
            : "The Tribeca team will confirm your commission terms with you."}
        </p>
      </div>
    </CommonCard>
  );
}
