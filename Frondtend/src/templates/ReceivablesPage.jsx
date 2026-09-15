import ReceivablesStats from "@/components/receivables/ReceivablesStats";
import ReceivablesContainer from "@/components/table/receivables/ReceivablesContainer";
import ReceivableDetailSheet from "@/components/receivables/ReceivableDetailSheet";

export default function ReceivablesPage() {
  return (
    <>
      <div className="flex flex-col gap-6 px-4 sm:px-6 py-6 pb-8">
        <ReceivablesStats />
        <ReceivablesContainer />
      </div>
      <ReceivableDetailSheet />
    </>
  );
}
