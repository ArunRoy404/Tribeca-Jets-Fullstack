"use client";

import { AlertTriangle, Calendar, Check } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useClientsStore } from "@/store/useClientsStore";

export default function ClientQuotesTab({ onScheduleFollowUp }) {
  const quotesHistory = useClientsStore((s) => s.quotesHistory);

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Mobile Card Presentation (lg:hidden) */}
      <div className="flex flex-col gap-3 w-full lg:hidden">
        {quotesHistory.map((item, idx) => (
          <div
            key={idx}
            className="flex flex-col gap-2.5 p-3.5 bg-white border border-border rounded-lg shadow-card text-[12px] font-montserrat"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-purple text-[13px]">{item.quoteId}</span>
              <StatusBadge status={item.status} bordered />
            </div>

            <div className="flex items-center justify-between text-foreground font-semibold border-b border-border/40 pb-2">
              <span>{item.from} → {item.to}</span>
              <span className="font-bold text-success text-[13px]">{item.amount}</span>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1">
              <span className="text-muted-foreground">{item.date}</span>
              <RowActionsMenu
                items={[
                  { label: "View Quote PDF", onSelect: () => alert(`Viewing PDF for ${item.quoteId}`) },
                  { label: "Resend to Client", onSelect: () => alert(`Resent ${item.quoteId} to client`) },
                ]}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Quotes Table (hidden lg:block) */}
      <div className="hidden lg:block border border-border rounded-lg bg-white shadow-card overflow-hidden w-full">
        <div className="overflow-x-auto w-full">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow className="bg-black/5 border-border hover:bg-black/5">
                <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Quote ID</TableHead>
                <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Route</TableHead>
                <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Amount</TableHead>
                <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Date</TableHead>
                <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Status</TableHead>
                <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Next Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotesHistory.map((item, idx) => (
                <TableRow key={idx} className="border-border hover:bg-purple/5 transition-colors">
                  <TableCell className="p-3 font-montserrat font-bold text-[11px] text-purple text-center">
                    {item.quoteId}
                  </TableCell>
                  <TableCell className="p-3 font-montserrat font-semibold text-[11px] text-foreground text-center">
                    {item.from} → {item.to}
                  </TableCell>
                  <TableCell className="p-3 font-montserrat font-bold text-[11px] text-success text-center">
                    {item.amount}
                  </TableCell>
                  <TableCell className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center whitespace-nowrap">
                    {item.date}
                  </TableCell>
                  <TableCell className="p-3 text-center">
                    <div className="flex justify-center">
                      <StatusBadge status={item.status} bordered />
                    </div>
                  </TableCell>
                  <TableCell className="p-3 text-center">
                    <div className="flex justify-center">
                      <RowActionsMenu
                        items={[
                          { label: "View Quote PDF", onSelect: () => alert(`Viewing PDF for ${item.quoteId}`) },
                          { label: "Resend to Client", onSelect: () => alert(`Resent ${item.quoteId} to client`) },
                        ]}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
