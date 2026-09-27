import TransactionsStats from "@/components/transactions/TransactionsStats";
import TransactionsContainer from "@/components/table/transactions/TransactionsContainer";

/**
 * Transactions (#19) — the money ledger. Read-only: every row opens the bill
 * it settles, so there is no detail sheet or dialog of its own.
 */
export default function TransactionsPage() {
  return (
    <div className="flex flex-col gap-6 px-4 sm:px-6 py-6 pb-8">
      <TransactionsStats />
      <TransactionsContainer />
    </div>
  );
}
