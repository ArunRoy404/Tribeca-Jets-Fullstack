"use client";

import Link from "next/link";
import { DollarSign, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * OperatorPaymentsTab
 *
 * NOTE FOR AI AGENTS / DEVELOPERS:
 * DO NOT DELETE THIS COMPONENT OR ITS TABLE MARKUP.
 *
 * Current API status:
 * - The Operator Payments / Receivables module has not yet connected payments to operators.
 * - `operator.payments` returns empty array `[]`.
 * - When `payments.length === 0`, this component renders an honest empty state ("No Payment Records")
 *   per the CRM core rule: "Never display a number the data did not supply".
 *
 * INSTRUCTIONS FOR WIRING THE API:
 * 1. Data source: `operator.payments` or `GET /api/operator-payments?operatorId={operator.id}`.
 * 2. When data is returned, this component will automatically render the pre-styled table below.
 * 3. Expected item wire shape:
 *    - tripId: string (e.g. "TJ-1051")
 *    - amount: string | number
 *    - paid: string | number
 *    - balance: string | number
 *    - due: string
 *    - status: string ("Paid", "Pending", "Due")
 *    - broker: string
 */

/*
// PREVIOUS HARDCODED MOCK DATA (KEPT FOR REFERENCE ONLY — DO NOT USE IN PRODUCTION):
// const defaultPayments = [
//   { id: "p-1", tripId: "TJ - 1051", amount: "$51,000", paid: "$0", balance: "$51,100", due: "Aug 20, 2026", status: "Pending", broker: "Mark" },
//   { id: "p-2", tripId: "TJ - 1052", amount: "$62,000", paid: "$62,000", balance: "$0", due: "-", status: "Paid", broker: "Barry" },
//   { id: "p-3", tripId: "TJ - 1043", amount: "$14,800", paid: "$0", balance: "$14,800", due: "Aug 10, 2026", status: "Due", broker: "Mark" },
// ];
*/

export default function OperatorPaymentsTab({ operator }) {
  const payments = operator?.payments || [];

  // Honest empty state when no payments exist in database for this operator
  if (payments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-lg border border-border w-full shadow-card">
        <div className="size-12 rounded-full bg-secondary flex items-center justify-center text-muted-foreground mb-3">
          <DollarSign className="size-6 text-muted-foreground" />
        </div>
        <p className="font-montserrat font-bold text-[16px] text-foreground">
          No Payment Records
        </p>
        <p className="font-montserrat text-[13px] text-muted-foreground mt-1 max-w-sm">
          No payment transactions have been logged for this operator yet.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full bg-white rounded-lg border border-border overflow-hidden shadow-card">
      <div className="overflow-x-auto w-full">
        <Table className="min-w-[850px]">
          <TableHeader>
            <TableRow className="bg-secondary/40 border-b border-border hover:bg-secondary/40">
              <TableHead className="py-3 px-4 font-montserrat font-bold text-[12px] text-foreground text-left">
                Trip
              </TableHead>
              <TableHead className="py-3 px-4 font-montserrat font-bold text-[12px] text-foreground text-left">
                Amount
              </TableHead>
              <TableHead className="py-3 px-4 font-montserrat font-bold text-[12px] text-foreground text-left">
                Paid
              </TableHead>
              <TableHead className="py-3 px-4 font-montserrat font-bold text-[12px] text-foreground text-left">
                Balance
              </TableHead>
              <TableHead className="py-3 px-4 font-montserrat font-bold text-[12px] text-foreground text-left">
                Due
              </TableHead>
              <TableHead className="py-3 px-4 font-montserrat font-bold text-[12px] text-foreground text-center">
                Status
              </TableHead>
              <TableHead className="py-3 px-4 font-montserrat font-bold text-[12px] text-foreground text-left">
                Broker
              </TableHead>
              <TableHead className="py-3 px-4 font-montserrat font-bold text-[12px] text-foreground text-center">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((p) => {
              const isPaid = p.status?.toLowerCase?.() === "paid";
              const isDue = p.status?.toLowerCase?.() === "due";
              const hasBalance = p.balance && p.balance !== "$0" && p.balance !== "0" && p.balance !== "—";

              return (
                <TableRow
                  key={p.id || p.tripId}
                  className="border-b border-border/60 hover:bg-secondary/20 transition-colors"
                >
                  <TableCell className="py-3.5 px-4 text-left">
                    <Link
                      href={`/dashboard/trips/${encodeURIComponent(String(p.tripId || p.id).replace(/\s+/g, ""))}`}
                      className="font-montserrat font-bold text-[13px] text-purple hover:underline"
                    >
                      {p.tripId || p.id}
                    </Link>
                  </TableCell>
                  <TableCell className="py-3.5 px-4 font-montserrat font-bold text-[13px] text-foreground text-left">
                    {p.amount}
                  </TableCell>
                  <TableCell className="py-3.5 px-4 font-montserrat font-bold text-[13px] text-success text-left">
                    {p.paid}
                  </TableCell>
                  <TableCell
                    className={`py-3.5 px-4 font-montserrat font-bold text-[13px] text-left ${
                      hasBalance ? "text-destructive" : "text-foreground"
                    }`}
                  >
                    {p.balance}
                  </TableCell>
                  <TableCell className="py-3.5 px-4 font-montserrat font-semibold text-[13px] text-foreground text-left">
                    {p.due}
                  </TableCell>
                  <TableCell className="py-3.5 px-4 text-center">
                    <div className="flex justify-center">
                      <span
                        className={`px-2.5 py-0.5 rounded font-montserrat font-medium text-[11px] border ${
                          isPaid
                            ? "bg-success/10 text-success border-success/30"
                            : isDue
                            ? "bg-warning/10 text-warning border-warning/30"
                            : "bg-secondary text-foreground/80 border-border"
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3.5 px-4 font-montserrat font-semibold text-[13px] text-foreground text-left">
                    {p.broker}
                  </TableCell>
                  <TableCell className="py-3.5 px-4 text-center">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center size-8 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      <MoreHorizontal className="size-4" />
                    </button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-border bg-white text-[12px] font-montserrat">
        <span className="text-muted-foreground font-medium">
          {payments.length} {payments.length === 1 ? "payment" : "payments"}
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-[12px] font-medium gap-1 cursor-pointer"
            disabled
          >
            ← Prev
          </Button>
          <button
            type="button"
            className="size-8 rounded-sm bg-[#252832] text-white font-bold text-[12px] flex items-center justify-center cursor-pointer"
          >
            1
          </button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-[12px] font-medium gap-1 cursor-pointer"
            disabled
          >
            Next →
          </Button>
        </div>
      </div>
    </div>
  );
}
