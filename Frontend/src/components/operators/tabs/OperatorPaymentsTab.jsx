"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, DollarSign, Loader2 } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import OperatorPaymentCard from "@/components/table/operator-payments/OperatorPaymentCard";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOperatorPayableStats, useOperatorPayables } from "@/hooks/operator-payments";
import { toPayableRow } from "@/lib/operatorPayment";
import { formatMoneyExact } from "@/lib/money";

const PAGE_SIZE = 10;
const HEAD = "py-3 px-4 font-montserrat font-bold text-[12px] text-foreground text-left";
const CELL = "py-3.5 px-4 font-montserrat text-[13px] text-left";

/**
 * The operator's Payments tab — their bills and what has been sent against
 * them, from Operator Payments (#17): `GET /operator-payments?operatorId=`
 * for the rows and `/stats?operatorId=` for the totals, both within the
 * caller's scope and computed by the API. A bill opens on the Operator
 * Payments board, where payments are recorded.
 *
 * The API used to send `payments: []` on the operator for this tab to read;
 * that stand-in is gone, because it claimed an operator we had paid had never
 * been paid.
 */
export default function OperatorPaymentsTab({ operator }) {
  const [page, setPage] = useState(1);
  const { data, isPending, error } = useOperatorPayables(
    { operatorId: operator?.id, page, limit: PAGE_SIZE },
    { enabled: Boolean(operator?.id) },
  );
  const { data: totals } = useOperatorPayableStats({ operatorId: operator?.id }, { enabled: Boolean(operator?.id) });
  const rows = (data?.data ?? []).map(toPayableRow);
  const meta = data?.meta;
  const href = (row) => `/dashboard/operator-payments?bill=${row.id}`;

  if (isPending) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground bg-white rounded-lg border border-border w-full">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (error || rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-lg border border-border w-full shadow-card">
        <div className="size-12 rounded-full bg-secondary flex items-center justify-center text-muted-foreground mb-3">
          <DollarSign className="size-6 text-muted-foreground" />
        </div>
        <p className="font-montserrat font-bold text-[16px] text-foreground">
          {error ? "Payments could not be loaded" : "No Payment Records"}
        </p>
        <p className="font-montserrat text-[13px] text-muted-foreground mt-1 max-w-sm">
          {error ? "Try again in a moment." : "No bills from this operator have been recorded yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full gap-3">
      {/* Desktop */}
      <div className="hidden lg:flex flex-col w-full bg-white rounded-lg border border-border overflow-hidden shadow-card">
        <div className="overflow-x-auto w-full">
          <Table className="min-w-212">
            <TableHeader>
              <TableRow className="bg-secondary/40 border-b border-border hover:bg-secondary/40">
                {["Bill", "Trip", "Amount", "Paid", "Balance", "Due", "Status", "Broker"].map((col) => (
                  <TableHead key={col} className={HEAD}>
                    {col}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} className="border-b border-border/60 hover:bg-secondary/20 transition-colors">
                  <TableCell className={`${CELL} font-bold`}>
                    <Link href={href(row)} className="text-info hover:underline">
                      {row.number}
                    </Link>
                  </TableCell>
                  <TableCell className={`${CELL} font-bold`}>
                    {row.tripId ? (
                      <Link href={`/dashboard/trips/${row.tripId}`} className="text-purple hover:underline">
                        {row.tripReference}
                      </Link>
                    ) : (
                      row.tripReference
                    )}
                  </TableCell>
                  <TableCell className={`${CELL} font-bold text-foreground`}>{row.total}</TableCell>
                  <TableCell className={`${CELL} font-bold text-success`}>{row.paid}</TableCell>
                  <TableCell className={`${CELL} font-bold ${row.hasBalance ? "text-destructive" : "text-foreground"}`}>
                    {row.balance}
                  </TableCell>
                  <TableCell className={`${CELL} font-semibold text-foreground`}>{row.due}</TableCell>
                  <TableCell className={CELL}>
                    <StatusBadge status={row.state} bordered />
                  </TableCell>
                  <TableCell className={`${CELL} font-semibold text-foreground`}>{row.broker}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile — the board's own card */}
      <div className="flex flex-col gap-3 w-full lg:hidden">
        {rows.map((row) => (
          <Link key={row.id} href={href(row)}>
            <OperatorPaymentCard item={row} />
          </Link>
        ))}
      </div>

      {/* Totals — the API's, over every bill from this operator */}
      {totals && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 px-4 bg-white border border-border rounded-lg font-montserrat text-[12px]">
          <span className="font-bold text-foreground">All bills</span>
          <div className="flex flex-wrap items-center gap-4 sm:gap-8">
            <span className="text-muted-foreground">
              Billed <span className="font-bold text-foreground">{formatMoneyExact(totals.payable)}</span>
            </span>
            <span className="text-muted-foreground">
              Paid <span className="font-bold text-success">{formatMoneyExact(totals.paid)}</span>
            </span>
            <span className="text-muted-foreground">
              Outstanding <span className="font-bold text-destructive">{formatMoneyExact(totals.outstanding)}</span>
            </span>
          </div>
        </div>
      )}

      {meta?.totalPages > 1 && (
        <div className="flex items-center justify-between gap-2">
          <span className="font-montserrat text-[12px] text-muted-foreground">
            {meta.total} bills · page {meta.page} of {meta.totalPages}
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={!meta.hasPrevious} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={!meta.hasNext} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
