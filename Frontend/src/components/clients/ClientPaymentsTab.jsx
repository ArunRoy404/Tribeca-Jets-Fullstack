"use client";

import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import ClientFollowUpBanner from "@/components/clients/ClientFollowUpBanner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Hardcoded preview data — will be wired to real API endpoint once payments API is connected
const PAYMENTS_PREVIEW = [
  {
    invoice: "INV-2026-108",
    trip: "TJ-1048",
    amount: "$79,500",
    paid: "$79,500",
    balance: "$0",
    status: "Paid",
    dueDate: "Aug 9, 2026",
  },
  {
    invoice: "INV-2026-097",
    trip: "TJ-1039",
    amount: "$42,500",
    paid: "$42,500",
    balance: "$0",
    status: "Paid",
    dueDate: "Jun 25, 2026",
  },
  {
    invoice: "INV-2026-071",
    trip: "TJ-1033",
    amount: "$36,000",
    paid: "$36,000",
    balance: "$0",
    status: "Paid",
    dueDate: "Apr 20, 2026",
  },
  {
    invoice: "INV-2026-029",
    trip: "TJ-1026",
    amount: "$36,000",
    paid: "$36,000",
    balance: "$0",
    status: "Paid",
    dueDate: "Feb 5, 2026",
  },
];

export default function ClientPaymentsTab({ onScheduleFollowUp }) {
  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Mobile Card Presentation (lg:hidden) */}
      <div className="flex flex-col gap-3 w-full lg:hidden">
        {PAYMENTS_PREVIEW.map((item, idx) => (
          <div
            key={idx}
            className="flex flex-col gap-2.5 p-3.5 bg-white border border-border rounded-lg shadow-card text-[12px] font-montserrat"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-purple text-[13px]">{item.invoice}</span>
                <span className="text-muted-foreground text-[11px]">({item.trip})</span>
              </div>
              <StatusBadge status={item.status} bordered />
            </div>

            <div className="grid grid-cols-3 gap-2 text-[11px] border-y border-border/40 py-2">
              <div>
                <span className="text-muted-foreground block text-[10px]">Amount</span>
                <span className="font-bold text-foreground">{item.amount}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Paid</span>
                <span className="font-bold text-success">{item.paid}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Balance</span>
                <span className="font-medium text-foreground">{item.balance}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-0.5">
              <span className="text-muted-foreground">Due: {item.dueDate}</span>
              <RowActionsMenu
                items={[
                  { label: "Download Receipt", onSelect: () => {} },
                  { label: "Send Payment Reminder", onSelect: () => {} },
                ]}
              />
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between p-3 bg-secondary/20 border border-border rounded-lg font-montserrat text-[12px]">
          <span className="font-bold text-foreground">Total</span>
          <div className="flex items-center gap-4">
            <span className="font-bold text-foreground">$145,000</span>
            <span className="font-bold text-success">$145,000</span>
          </div>
        </div>
      </div>

      {/* Desktop Payments Table (hidden lg:block) */}
      <div className="hidden lg:block border border-border rounded-lg bg-white shadow-card overflow-hidden w-full">
        <div className="overflow-x-auto w-full">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow className="bg-black/5 border-border hover:bg-black/5">
                <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Invoice</TableHead>
                <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Trip</TableHead>
                <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Amount</TableHead>
                <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Paid</TableHead>
                <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Balance</TableHead>
                <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Status</TableHead>
                <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Due Date</TableHead>
                <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Next Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PAYMENTS_PREVIEW.map((item, idx) => (
                <TableRow key={idx} className="border-border hover:bg-purple/5 transition-colors">
                  <TableCell className="p-3 font-montserrat font-bold text-[11px] text-purple text-center">
                    {item.invoice}
                  </TableCell>
                  <TableCell className="p-3 font-montserrat font-bold text-[11px] text-purple text-center">
                    {item.trip}
                  </TableCell>
                  <TableCell className="p-3 font-montserrat font-bold text-[11px] text-foreground text-center">
                    {item.amount}
                  </TableCell>
                  <TableCell className="p-3 font-montserrat font-bold text-[11px] text-success text-center">
                    {item.paid}
                  </TableCell>
                  <TableCell className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">
                    {item.balance}
                  </TableCell>
                  <TableCell className="p-3 text-center">
                    <div className="flex justify-center">
                      <StatusBadge status={item.status} bordered />
                    </div>
                  </TableCell>
                  <TableCell className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center whitespace-nowrap">
                    {item.dueDate}
                  </TableCell>
                  <TableCell className="p-3 text-center">
                    <div className="flex justify-center">
                      <RowActionsMenu
                        items={[
                          { label: "Download Receipt", onSelect: () => {} },
                          { label: "Send Payment Reminder", onSelect: () => {} },
                        ]}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Total Summary Bar */}
        <div className="flex items-center justify-between p-3 px-6 bg-secondary/20 border-t border-border font-montserrat text-[12px]">
          <span className="font-bold text-foreground">Total</span>
          <div className="flex items-center gap-8">
            <span className="font-bold text-foreground">$145,000</span>
            <span className="font-bold text-success">$145,000</span>
          </div>
        </div>
      </div>

      {/* Follow-up Banner Card */}
      <ClientFollowUpBanner onScheduleFollowUp={onScheduleFollowUp} />
    </div>
  );
}
