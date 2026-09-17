"use client";

import { useRouter } from "next/navigation";
import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import DetailCard from "@/components/common/DetailCard";
import ClientFollowUpBanner from "@/components/clients/ClientFollowUpBanner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuotes } from "@/hooks/quotes";
import { toQuoteRow } from "@/lib/quote";

/**
 * Every quote this client has been sent.
 *
 * Wired in the second pass when Quotes (#10) shipped. It was an honest empty
 * state until then — "No quotes on record" was true of every client, because
 * no quote existed anywhere. The day the module landed that same empty state
 * became a wrong answer, which is what the second pass exists to catch.
 */
export default function ClientQuotesTab({ client, onScheduleFollowUp, onMarkComplete, isCompleting }) {
  const router = useRouter();

  const { data, isPending } = useQuotes(
    { clientId: client?.id, limit: 10, sortBy: "createdAt", sortOrder: "desc" },
    { enabled: Boolean(client?.id) },
  );

  const quotes = (data?.data ?? []).map(toQuoteRow);
  const hasQuotes = quotes.length > 0;
  const total = data?.meta?.total ?? 0;

  const openQuote = (id) => router.push(`/dashboard/quotes/${id}`);
  const rowActions = (item) => [
    { label: "View Quote", onSelect: () => openQuote(item.id) },
  ];

  return (
    <DetailCard className="gap-6 p-4 sm:p-6">
      {hasQuotes ? (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block border border-border rounded-lg overflow-hidden w-full">
            <div className="overflow-x-auto w-full">
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow className="bg-black/5 border-border hover:bg-black/5">
                    <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Quote ID</TableHead>
                    <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Route</TableHead>
                    <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Total</TableHead>
                    <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Version</TableHead>
                    <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Valid Until</TableHead>
                    <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Status</TableHead>
                    <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.map((item) => (
                    <TableRow
                      key={item.id}
                      onClick={() => openQuote(item.id)}
                      className="border-border hover:bg-purple/5 transition-colors cursor-pointer"
                    >
                      <TableCell className="p-3 font-montserrat font-bold text-[11px] text-purple text-center">
                        {item.reference}
                      </TableCell>
                      <TableCell className="p-3 font-montserrat font-semibold text-[11px] text-foreground text-center">
                        {item.origin} → {item.destination}
                      </TableCell>
                      <TableCell className="p-3 font-montserrat font-bold text-[11px] text-success text-center">
                        {item.total}
                      </TableCell>
                      <TableCell className="p-3 font-montserrat text-[11px] text-muted-foreground text-center">
                        {item.version}
                      </TableCell>
                      {/* An expired offer that still reads "Sent" is the one a
                          broker chases by mistake. */}
                      <TableCell
                        className={`p-3 font-montserrat text-[11px] text-center ${
                          item.isExpired ? "text-destructive font-semibold" : "text-muted-foreground"
                        }`}
                      >
                        {item.expiry}
                      </TableCell>
                      <TableCell className="p-3 text-center">
                        <div className="flex justify-center">
                          <StatusBadge status={item.status} bordered />
                        </div>
                      </TableCell>
                      <TableCell className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center">
                          <RowActionsMenu items={rowActions(item)} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-3 w-full lg:hidden">
            {quotes.map((item) => (
              <div
                key={item.id}
                onClick={() => openQuote(item.id)}
                className="flex flex-col gap-2.5 p-3.5 bg-white border border-border rounded-lg shadow-card text-[12px] font-montserrat cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple text-[13px]">{item.reference}</span>
                  <StatusBadge status={item.status} bordered />
                </div>

                <div className="flex items-center justify-between text-foreground font-semibold border-b border-border/40 pb-2">
                  <span>{item.origin} → {item.destination}</span>
                  <span className="font-bold text-success text-[13px]">{item.total}</span>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1 text-muted-foreground">
                  <span>{item.version} · {item.departure}</span>
                  <span className={item.isExpired ? "text-destructive font-semibold" : ""}>
                    {item.expiry}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {total > quotes.length && (
            <p className="font-montserrat text-[12px] text-muted-foreground">
              Showing the {quotes.length} most recent of {total}.
            </p>
          )}
        </>
      ) : (
        <div className="py-12 flex flex-col items-center justify-center text-center gap-2">
          <p className="font-montserrat font-semibold text-[15px] text-foreground">
            {isPending ? "Loading quotes…" : "No quotes on record"}
          </p>
          {!isPending && (
            <p className="font-montserrat text-[12px] text-muted-foreground max-w-sm">
              No quotes have been written for this client yet.
            </p>
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
