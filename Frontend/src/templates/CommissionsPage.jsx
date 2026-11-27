import CommissionsStats from "@/components/commissions/CommissionsStats";
import CommissionsContainer from "@/components/table/commissions/CommissionsContainer";
import CommissionDetailSheet from "@/components/commissions/CommissionDetailSheet";
import MarkCommissionPaidDialog from "@/components/commissions/MarkCommissionPaidDialog";

export default function CommissionsPage() {
  return (
    <>
      <div className="flex flex-col gap-6 px-4 sm:px-6 py-6 pb-8">
        <CommissionsStats />
        <CommissionsContainer />
      </div>
      <CommissionDetailSheet />
      <MarkCommissionPaidDialog />
    </>
  );
}
