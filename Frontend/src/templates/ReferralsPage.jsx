import ReferralsStats from "@/components/referrals/ReferralsStats";
import ReferralsContainer from "@/components/table/referrals/ReferralsContainer";
import ReferralDetailSheet from "@/components/referrals/ReferralDetailSheet";
import ReferralResourcesCard from "@/components/referrals/ReferralResourcesCard";

/**
 * The desk's side of the partner portal (#11): the referrals agents have
 * submitted, worked into clients and trip requests here, and the Resources
 * library the portal shows them.
 */
export default function ReferralsPage() {
  return (
    <>
      <div className="flex flex-col gap-6 px-4 sm:px-6 py-6 pb-8">
        <ReferralsStats />
        <ReferralsContainer />
        <ReferralResourcesCard />
      </div>
      <ReferralDetailSheet />
    </>
  );
}
