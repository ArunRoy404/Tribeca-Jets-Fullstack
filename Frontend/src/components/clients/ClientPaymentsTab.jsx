"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Loader2, Receipt } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import DetailCard from "@/components/common/DetailCard";
import ClientFollowUpBanner from "@/components/clients/ClientFollowUpBanner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useReceivableStats, useReceivables } from "@/hooks/receivables";
import { toReceivableRow } from "@/lib/receivable";
import { formatMoneyExact } from "@/lib/money";

const PAGE_SIZE = 10;
const HEAD = "p-3 font-montserrat font-medium text-[11px] text-foreground text-center";
const CELL = "p-3 font-montserrat text-[11px] text-center";

/**
 * The client's Payments tab — the invoices billed to them and what has come
 * in, from Receivables (#16): `GET /receivables?clientId=` for the rows and
 * `GET /receivables/stats?clientId=` for the totals, both within the caller's
 * scope and both computed by the API. Nothing is summed in the browser.
 *
 * Each invoice opens on the Receivables board, where payments are recorded.
 * The old tab's "Download Receipt" and "Send Payment Reminder" did nothing
 * and are gone until Document Vault (#22) and Email Templates (#21) can.
 */
export default function ClientPaymentsTab({ client, onScheduleFollowUp, onMarkComplete, isCompleting }) {
  const [page, setPage] = useState(1);
  const { data, isPending, error } = useReceivables(
    { clientId: client?.id, page, limit: PAGE_SIZE },
    { enabled: Boolean(client?.id) },
  );
  const { data: totals } = useReceivableStats({ clientId: client?.id }, { enabled: Boolean(client?.id) });
  const rows = (data?.data ?? []).map(toReceivableRow);
  const meta = data?.meta;
  const href = (row) => `/dashboard/receivables?invoice=${row.id}`;

  return (
    <DetailCard className="gap-6 p-4 sm:p-6">
      {isPending ? (
        <div className="flex items-center justify-center p-12 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : error || rows.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center gap-2">
          <div className="size-12 rounded-full bg-secondary flex items-center justify-center text-muted-foreground mb-1">
            <Receipt className="size-6" />
          </div>
          <p className="font-montserrat font-semibold text-[15px] text-foreground">
            {error ? "Payments could not be loaded" : "No invoices on record"}
          </p>
          <p className="font-montserrat text-[12px] text-muted-foreground max-w-sm">
            {error ? "Try again in a moment." : "No invoices have been raised for this client yet."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 w-full">
          {/* Desktop */}
          <div className="hidden lg:block border border-border rounded-lg overflow-hidden w-full">
            <div className="overflow-x-auto w-full">
              <Table className="min-w-200">
                <TableHeader>
                  <TableRow className="bg-black/5 border-border hover:bg-black/5">
                    {["Invoice", "Trip", "Total", "Paid", "Balance", "Status", "Due Date"].map((col) => (
                      <TableHead key={col} className={HEAD}>
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id} className="border-border hover:bg-purple/5 transition-colors">
                      <TableCell className={`${CELL} font-bold`}>
                        <Link href={href(row)} className="text-purple hover:underline">
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
                      <TableCell className={`${CELL} font-medium ${row.hasBalance ? "text-destructive" : "text-foreground"}`}>
                        {row.balance}
                      </TableCell>
                      <TableCell className={CELL}>
                        <div className="flex justify-center">
                          <StatusBadge status={row.state} bordered />
                        </div>
                      </TableCell>
                      <TableCell className={`${CELL} font-medium text-foreground whitespace-nowrap`}>{row.due}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Mobile */}
          <div className="flex flex-col gap-3 w-full lg:hidden">
            {rows.map((row) => (
              <Link
                key={row.id}
                href={href(row)}
                className="flex flex-col gap-2.5 p-3.5 bg-white border border-border rounded-lg shadow-card text-[12px] font-montserrat"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-purple text-[13px] truncate">{row.number}</span>
                    <span className="text-muted-foreground text-[11px]">({row.tripReference})</span>
                  </div>
                  <StatusBadge status={row.state} bordered />
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px] border-y border-border/40 py-2">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Total</span>
                    <span className="font-bold text-foreground">{row.total}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Paid</span>
                    <span className="font-bold text-success">{row.paid}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Balance</span>
                    <span className={`font-medium ${row.hasBalance ? "text-destructive" : "text-foreground"}`}>{row.balance}</span>
                  </div>
                </div>
                <span className="text-[11px] text-muted-foreground">Due: {row.due}</span>
              </Link>
            ))}
          </div>

          {/* Totals — the API's, over every invoice billed to this client */}
          {totals && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 px-4 sm:px-6 bg-secondary/20 border border-border rounded-lg font-montserrat text-[12px]">
              <span className="font-bold text-foreground">All invoices</span>
              <div className="flex flex-wrap items-center gap-4 sm:gap-8">
                <span className="text-muted-foreground">
                  Invoiced <span className="font-bold text-foreground">{formatMoneyExact(totals.invoiced)}</span>
                </span>
                <span className="text-muted-foreground">
                  Paid <span className="font-bold text-success">{formatMoneyExact(totals.collected)}</span>
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
                {meta.total} invoices · page {meta.page} of {meta.totalPages}
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
      )}

      <ClientFollowUpBanner
        client={client}
        onScheduleFollowUp={onScheduleFollowUp}
        onMarkComplete={onMarkComplete}
        isCompleting={isCompleting}
      />
    </DetailCard>
  );
}
