"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import CommonCard from "@/components/common/CommonCard";
import Reveal from "@/components/common/Reveal";
import TablePagination from "@/components/table/common/TablePagination";
import TableStatus from "@/components/table/common/TableStatus";
import TransactionsToolbar from "./TransactionsToolbar";
import TransactionsCardsContainer from "./TransactionsCardsContainer";
import TransactionsTable from "./TransactionsTable";
import { useTransactions, useTransactionsTableParams } from "@/hooks/transactions";
import { toTransactionRow } from "@/lib/transaction";

/**
 * The money ledger, API-backed and read-only: every payment received, every
 * payment sent to an operator and every commission paid, by the day the money
 * moved. The URL is the state and the server pages — merging the three
 * sources is the API's job, never the browser's.
 *
 * A row opens the bill it settles on that bill's own page, which is where a
 * movement is corrected or withdrawn. The old screen's Record Payment, Edit
 * and Delete wrote to dummy rows and are gone.
 */
export default function TransactionsContainer({ revealDelay = 0 }) {
  const router = useRouter();
  const params = useTransactionsTableParams();
  const { data, isPending, error, refetch } = useTransactions(params.queryParams);

  const rows = useMemo(() => (data?.data ?? []).map(toTransactionRow), [data?.data]);
  const meta = data?.meta;
  const isEmpty = !isPending && !error && rows.length === 0;
  const open = (href) => router.push(href);

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <TransactionsToolbar
          search={params.search}
          setSearch={params.setSearch}
          kind={params.kind}
          setKind={params.setKind}
          from={params.from}
          setFrom={params.setFrom}
          to={params.to}
          setTo={params.setTo}
          sortOrder={params.sortOrder}
          setSortOrder={params.setSortOrder}
          limit={params.limit}
          setLimit={params.setLimit}
          hasFilters={params.hasFilters}
          onClear={params.clearFilters}
        />

        {isPending || error || isEmpty ? (
          <TableStatus
            isLoading={isPending}
            error={error}
            isEmpty={isEmpty}
            emptyMessage="No money has moved under these filters"
            emptyHint={
              params.hasFilters
                ? "Try clearing a filter."
                : "Payments recorded on invoices and operator bills, and commissions marked paid, appear here."
            }
            onRetry={refetch}
          />
        ) : (
          <>
            <div className="relative w-full lg:hidden p-3">
              <TransactionsCardsContainer items={rows} onOpen={open} />
            </div>

            <TransactionsTable pageItems={rows} onOpen={open} />

            <div className="relative w-full">
              <TablePagination
                totalCount={meta?.total ?? 0}
                itemLabel="transactions"
                page={meta?.page ?? 1}
                pageCount={meta?.totalPages ?? 1}
                onPageChange={(next) => params.goToPage(next, meta?.totalPages ?? 1)}
                onPrev={() => params.goToPage((meta?.page ?? 1) - 1, meta?.totalPages ?? 1)}
                onNext={() => params.goToPage((meta?.page ?? 1) + 1, meta?.totalPages ?? 1)}
              />
            </div>
          </>
        )}
      </CommonCard>
    </Reveal>
  );
}
