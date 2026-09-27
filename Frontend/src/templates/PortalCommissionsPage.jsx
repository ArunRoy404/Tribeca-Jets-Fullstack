import { PortalCommissionStats } from "@/components/portal/PortalStats";
import CommissionTermsCard from "@/components/portal/commissions/CommissionTermsCard";
import PortalCommissionsContainer from "@/components/portal/commissions/PortalCommissionsContainer";

/** The partner portal's Commission Center (#11): the agent's terms, totals and commissions. */
export default function PortalCommissionsPage() {
  return (
    <div className="flex flex-col gap-6 px-4 sm:px-6 py-6 pb-8">
      <CommissionTermsCard />
      <PortalCommissionStats />
      <PortalCommissionsContainer />
    </div>
  );
}
