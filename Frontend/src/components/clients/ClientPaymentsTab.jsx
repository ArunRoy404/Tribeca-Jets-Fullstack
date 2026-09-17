"use client";

import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import DetailCard from "@/components/common/DetailCard";
import ClientFollowUpBanner from "@/components/clients/ClientFollowUpBanner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/**
 * Client Payments & Invoices Tab
 *
 * TODO [API Integration - Invoices Module]:
 * When the Invoices/Payments API module is connected to Clients:
 * 1. Fetch invoices for this client:
 *    GET /api/invoices?clientId={clientId}&page={page}&limit={limit}
 * 2. Expected Payment/Invoice record schema:
 *    - invoice: string (e.g. "INV-2026-108")
 *    - trip: string (e.g. "TJ-1048")
 *    - amount: string (formatted invoice amount)
 *    - paid: string (formatted amount paid)
 *    - balance: string (formatted remaining balance)
 *    - status: string (e.g. "PAID", "PARTIALLY_PAID", "PENDING", "OVERDUE")
 *    - dueDate: string (formatted due date string)
 * 3. Pass `payments` array and `totalSummary` to render rows and totals.
 * 4. In the absence of payment records, render an honest empty state per project agreement.
 */
export default function ClientPaymentsTab({ payments = [], totalSummary, onScheduleFollowUp, client, onMarkComplete, isCompleting }) {
  const hasPayments = Array.isArray(payments) && payments.length > 0;

  return (
    <DetailCard className="gap-6 p-4 sm:p-6">
      {hasPayments ? (
        <>
          {/* Desktop Payments Table (hidden lg:block) */}
          <div className="hidden lg:block border border-border rounded-lg overflow-hidden w-full">
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
                  {payments.map((item, idx) => (
                    <TableRow key={item.invoice || idx} className="border-border hover:bg-purple/5 transition-colors">
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
            {totalSummary && (
              <div className="flex items-center justify-between p-3 px-6 bg-secondary/20 border-t border-border font-montserrat text-[12px]">
                <span className="font-bold text-foreground">Total</span>
                <div className="flex items-center gap-8">
                  <span className="font-bold text-foreground">{totalSummary.amount}</span>
                  <span className="font-bold text-success">{totalSummary.paid}</span>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Card Presentation (lg:hidden) */}
          <div className="flex flex-col gap-3 w-full lg:hidden">
            {payments.map((item, idx) => (
              <div
                key={item.invoice || idx}
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

            {totalSummary && (
              <div className="flex items-center justify-between p-3 bg-secondary/20 border border-border rounded-lg font-montserrat text-[12px]">
                <span className="font-bold text-foreground">Total</span>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-foreground">{totalSummary.amount}</span>
                  <span className="font-bold text-success">{totalSummary.paid}</span>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="py-12 flex flex-col items-center justify-center text-center gap-2">
          <p className="font-montserrat font-semibold text-[15px] text-foreground">
            No payments on record
          </p>
          <p className="font-montserrat text-[12px] text-muted-foreground max-w-sm">
            No invoices or transaction records have been issued for this client yet.
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
