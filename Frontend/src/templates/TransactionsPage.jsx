import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import TransactionsContainer from "@/components/table/transactions/TransactionsContainer";
import TransactionDetailSheet from "@/components/transactions/TransactionDetailSheet";
import { transactionsStats } from "@/dummyData/transactions";

export default function TransactionsPage() {
  return (
    <>
      <div className="flex flex-col gap-6 px-4 sm:px-6 py-6 pb-8">
        <SimpleStatsRow stats={transactionsStats} />
        <TransactionsContainer />
      </div>
      <TransactionDetailSheet />
    </>
  );
}
