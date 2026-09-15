"use client";

import Image from "next/image";
import { DollarSign, FileText } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import TablePagination from "@/components/table/common/TablePagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const columns = [
  "Trip ID",
  "Amount",
  "Paid",
  "Balance",
  "Due Date",
  "Status",
  "Broker",
  "Action",
];

export default function OperatorPaymentsTab({ operator }) {
  const payments = operator?.payments || [];

  if (payments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-md border border-border w-full">
        <DollarSign className="size-10 text-muted-foreground/50 mb-3" />
        <p className="font-montserrat font-bold text-[16px] text-foreground">No Payments History</p>
        <p className="font-montserrat text-[13px] text-muted-foreground mt-1">
          No payment transactions have been logged for this operator.
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-start rounded-md border border-border overflow-hidden w-full">
      <Image
        src="/dashboard/bg/trips-table.png"
        alt=""
        fill
        className="object-cover opacity-50 pointer-events-none"
        sizes="1600px"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-white/90 to-[#e5eeff]/90 backdrop-blur-2xl pointer-events-none" />

      {/* Mobile Card List (< lg) */}
      <div className="relative w-full lg:hidden flex flex-col gap-2 p-3">
        {payments.map((p) => (
          <div
            key={p.tripId}
            className="flex flex-col gap-2.5 items-start p-3 w-full rounded-sm border border-border bg-white"
          >
            <div className="flex items-center justify-between gap-2 w-full">
              <div className="flex items-center gap-2 min-w-0">
                <p className="font-montserrat font-semibold text-[13px] text-purple truncate">{p.tripId}</p>
              </div>
              <StatusBadge status={p.status} bordered />
            </div>

            <div className="flex items-start justify-between gap-3 w-full text-[12px] font-montserrat">
              <div>
                <span className="text-muted-foreground text-[10px] block">Amount / Broker</span>
                <span className="font-bold text-foreground">{p.amount} ({p.broker})</span>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground text-[10px] block">Due Date</span>
                <span className="font-semibold text-foreground">{p.due}</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 w-full pt-2 border-t border-border text-[12px] font-montserrat">
              <div>
                <span className="text-muted-foreground text-[10px] block">Paid</span>
                <span className="font-bold text-success">{p.paid}</span>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground text-[10px] block">Balance</span>
                <span className="font-bold text-destructive">{p.balance}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table (>= lg) */}
      <div className="relative w-full overflow-x-auto hidden lg:block">
        <Table className="min-w-[1000px]">
          <TableHeader>
            <TableRow className="bg-black/10 border-border hover:bg-black/10">
              {columns.map((col) => (
                <TableHead key={col} className="p-[10px] font-montserrat font-bold text-[12px] text-foreground text-center whitespace-nowrap h-auto">
                  {col}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((p) => (
              <TableRow key={p.tripId} className="border-border hover:bg-secondary/40 transition-colors">
                <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-purple text-center">
                  {p.tripId}
                </TableCell>
                <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-foreground text-center">
                  {p.amount}
                </TableCell>
                <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-success text-center">
                  {p.paid}
                </TableCell>
                <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-destructive text-center">
                  {p.balance}
                </TableCell>
                <TableCell className="p-[10px] font-montserrat font-semibold text-[12px] text-foreground text-center">
                  {p.due}
                </TableCell>
                <TableCell className="p-[10px] text-center">
                  <div className="flex justify-center">
                    <StatusBadge status={p.status} bordered />
                  </div>
                </TableCell>
                <TableCell className="p-[10px] font-montserrat font-semibold text-[12px] text-muted-foreground text-center">
                  {p.broker}
                </TableCell>
                <TableCell className="p-[10px] text-center">
                  <div className="flex justify-center">
                    <RowActionsMenu
                      items={[
                        { label: "View Invoice", icon: <FileText /> },
                        { label: "Record Payment", icon: <DollarSign /> },
                      ]}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="relative w-full">
        <TablePagination totalCount={payments.length} itemLabel="payments" page={1} pageCount={1} onPrev={() => {}} onNext={() => {}} />
      </div>
    </div>
  );
}
