"use client";

import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import ClientFollowUpBanner from "@/components/clients/ClientFollowUpBanner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Hardcoded preview data — will be wired to real API endpoint once quotes API is connected
const QUOTES_PREVIEW = [
  {
    quoteId: "Q-2026-042",
    from: "KTEB",
    to: "KPBI",
    amount: "$79,500",
    date: "Aug 8, 2026",
    status: "Sent",
  },
  {
    quoteId: "Q-2026-039",
    from: "KTEB",
    to: "KMIA",
    amount: "$42,500",
    date: "Aug 5, 2026",
    status: "Accepted",
  },
  {
    quoteId: "Q-2026-028",
    from: "KMIA",
    to: "EGLL",
    amount: "$36,000",
    date: "Jun 18, 2026",
    status: "Expired",
  },
];

export default function ClientQuotesTab({ onScheduleFollowUp }) {
  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Mobile Card Presentation (lg:hidden) */}
      <div className="flex flex-col gap-3 w-full lg:hidden">
        {QUOTES_PREVIEW.map((item, idx) => (
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
                  { label: "View Quote PDF", onSelect: () => {} },
                  { label: "Resend to Client", onSelect: () => {} },
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
              {QUOTES_PREVIEW.map((item, idx) => (
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
                          { label: "View Quote PDF", onSelect: () => {} },
                          { label: "Resend to Client", onSelect: () => {} },
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
      <ClientFollowUpBanner onScheduleFollowUp={onScheduleFollowUp} />
    </div>
  );
}
