import { PortalReferralStats } from "@/components/portal/PortalStats";
import PortalReferralsContainer from "@/components/portal/referrals/PortalReferralsContainer";
import PortalReferralSheet from "@/components/portal/referrals/PortalReferralSheet";

/** The partner portal's My Referrals screen (#11): the agent's own referrals and their progress. */
export default function PortalReferralsPage() {
  return (
    <>
      <div className="flex flex-col gap-6 px-4 sm:px-6 py-6 pb-8">
        <PortalReferralStats />
        <PortalReferralsContainer />
      </div>
      <PortalReferralSheet />
    </>
  );
}
