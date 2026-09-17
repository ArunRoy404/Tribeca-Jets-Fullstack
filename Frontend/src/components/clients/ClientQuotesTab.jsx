"use client";

import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import DetailCard from "@/components/common/DetailCard";
import ClientFollowUpBanner from "@/components/clients/ClientFollowUpBanner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/**
 * Client Quotes Tab
 *
 * TODO [API Integration - Quotes Module]:
 * When the Quotes API module is connected to Clients:
 * 1. Fetch quotes for this client:
 *    GET /api/quotes?clientId={clientId}&page={page}&limit={limit}
 * 2. Expected Quote record schema:
 *    - quoteId: string (e.g. "Q-2026-042")
 *    - from: string (origin airport ICAO/IATA code)
 *    - to: string (destination airport ICAO/IATA code)
 *    - amount: string (formatted currency amount)
 *    - date: string (formatted quote date string)
 *    - status: string (e.g. "SENT", "ACCEPTED", "EXPIRED", "REJECTED")
 * 3. In the absence of quotes, render an honest empty state per project agreement.
 */
export default function ClientQuotesTab({ quotes = [], onScheduleFollowUp, client, onMarkComplete, isCompleting }) {
  const hasQuotes = Array.isArray(quotes) && quotes.length > 0;

  return (
    <DetailCard className="gap-6 p-4 sm:p-6">
      {hasQuotes ? (
        <>
          {/* Desktop Quotes Table (hidden lg:block) */}
          <div className="hidden lg:block border border-border rounded-lg overflow-hidden w-full">
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
                  {quotes.map((item, idx) => (
                    <TableRow key={item.quoteId || idx} className="border-border hover:bg-purple/5 transition-colors">
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

          {/* Mobile Card Presentation (lg:hidden) */}
          <div className="flex flex-col gap-3 w-full lg:hidden">
            {quotes.map((item, idx) => (
              <div
                key={item.quoteId || idx}
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
        </>
      ) : (
        <div className="py-12 flex flex-col items-center justify-center text-center gap-2">
          <p className="font-montserrat font-semibold text-[15px] text-foreground">
            No quotes on record
          </p>
          <p className="font-montserrat text-[12px] text-muted-foreground max-w-sm">
            No quotes have been requested or generated for this client yet.
          </p>
        </div>
      )}

      {/* Follow-up Banner Card */}
      <ClientFollowUpBanner
        client={client}
        onScheduleFollowUp={onScheduleFollowUp}
        onMarkComplete={onMarkComplete}
        isCompleting={isCompleting}
      />
    </DetailCard>
  );
}
