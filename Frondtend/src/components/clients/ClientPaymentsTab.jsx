"use client";

import { AlertTriangle, Calendar, Check } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useClientsStore } from "@/store/useClientsStore";

export default function ClientPaymentsTab({ onScheduleFollowUp }) {
  const paymentsHistory = useClientsStore((s) => s.paymentsHistory);

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Mobile Card Presentation (lg:hidden) */}
      <div className="flex flex-col gap-3 w-full lg:hidden">
        {paymentsHistory.map((item, idx) => (
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
                  { label: "Download Receipt", onSelect: () => alert(`Downloading receipt for ${item.invoice}`) },
                  { label: "Send Payment Reminder", onSelect: () => alert(`Reminder sent for ${item.invoice}`) },
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
              {paymentsHistory.map((item, idx) => (
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
                          { label: "Download Receipt", onSelect: () => alert(`Downloading receipt for ${item.invoice}`) },
                          { label: "Send Payment Reminder", onSelect: () => alert(`Reminder sent for ${item.invoice}`) },
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
      <div className="p-4 bg-warning/5 border border-warning/30 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-full bg-warning/15 text-warning flex items-center justify-center shrink-0">
            <AlertTriangle className="size-4.5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-montserrat font-bold text-[13px] text-foreground">
                Follow-up: Aug 12, 2026
              </span>
              <Badge tone="info" size="sm" className="font-bold text-[10px]">
                Upcoming
              </Badge>
            </div>
            <p className="font-montserrat text-[11px] text-muted-foreground">
              Check availability for Miami → New York round trip in September
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3 text-[12px] gap-1.5 font-medium flex-1 sm:flex-none"
            onClick={onScheduleFollowUp}
          >
            <Calendar className="size-3.5" />
            Schedule Follow-up
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3 text-[12px] gap-1.5 font-medium flex-1 sm:flex-none"
            onClick={() => alert("Marked follow-up as complete!")}
          >
            <Check className="size-3.5" />
            Mark Complete
          </Button>
        </div>
      </div>
    </div>
  );
}
