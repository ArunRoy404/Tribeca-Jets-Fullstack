import OperatorPaymentsStats from "@/components/operator-payments/OperatorPaymentsStats";
import OperatorPaymentsContainer from "@/components/table/operator-payments/OperatorPaymentsContainer";
import OperatorPaymentDetailSheet from "@/components/operator-payments/OperatorPaymentDetailSheet";

export default function OperatorPaymentsPage() {
  return (
    <>
      <div className="flex flex-col gap-6 px-4 sm:px-6 py-6 pb-8">
        <OperatorPaymentsStats />
        <OperatorPaymentsContainer />
      </div>
      <OperatorPaymentDetailSheet />
    </>
  );
}
