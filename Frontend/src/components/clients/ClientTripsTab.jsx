"use client";

import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import DetailCard from "@/components/common/DetailCard";
import ClientFollowUpBanner from "@/components/clients/ClientFollowUpBanner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/**
 * Client Trips Tab
 *
 * TODO [API Integration - Trips Module]:
 * When the Trips API module is built and connected to Clients:
 * 1. Fetch trips for this client:
 *    GET /api/trips?clientId={clientId}&page={page}&limit={limit}
 * 2. Expected Trip record schema:
 *    - id: string (e.g. "TJ-1048")
 *    - broker: string (broker display name)
 *    - from: string (origin airport ICAO/IATA code)
 *    - to: string (destination airport ICAO/IATA code)
 *    - departure: string (formatted departure datetime)
 *    - returnDate: string (formatted return datetime or "—")
 *    - operator: string (operator name)
 *    - aircraft: string (aircraft model / tail number)
 *    - status: string (e.g. "CONFIRMED", "BOOKED")
 *    - clientPmt: string (e.g. "PAID", "PARTIALLY_PAID", "QUOTED")
 *    - fet: string (formatted FET tax amount)
 *    - profit: string (formatted broker margin)
 * 3. Pass `trips` array and `totalProfit` / pagination meta to render rows.
 * 4. In the absence of trip records, render an honest empty state per project agreement.
 */
export default function ClientTripsTab({ trips = [], totalProfit, onScheduleFollowUp, client, onMarkComplete, isCompleting }) {
  const hasTrips = Array.isArray(trips) && trips.length > 0;

  return (
    <DetailCard className="gap-6 p-4 sm:p-6">
      {hasTrips ? (
        <>
          {/* Desktop Trips Table (hidden lg:block) */}
          <div className="hidden lg:block border border-border rounded-lg overflow-hidden w-full">
            <div className="overflow-x-auto w-full">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow className="bg-black/5 border-border hover:bg-black/5">
                    <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Trip ID</TableHead>
                    <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Broker</TableHead>
                    <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Route</TableHead>
                    <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Departure</TableHead>
                    <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Return</TableHead>
                    <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Aircraft · Operator</TableHead>
                    <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Status</TableHead>
                    <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Client Pmt</TableHead>
                    <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">FET (7.5%)</TableHead>
                    <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Profit</TableHead>
                    <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Next Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trips.map((item, idx) => (
                    <TableRow key={item.id || idx} className="border-border hover:bg-purple/5 transition-colors">
                      <TableCell className="p-3 font-montserrat font-bold text-[11px] text-purple text-center">
                        {item.id}
                      </TableCell>
                      <TableCell className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">
                        {item.broker}
                      </TableCell>
                      <TableCell className="p-3 font-montserrat font-semibold text-[11px] text-foreground text-center">
                        {item.from} → {item.to}
                      </TableCell>
                      <TableCell className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center whitespace-nowrap">
                        {item.departure}
                      </TableCell>
                      <TableCell className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center whitespace-nowrap">
                        {item.returnDate || "—"}
                      </TableCell>
                      <TableCell className="p-3 font-montserrat text-[11px] text-foreground text-center max-w-40 truncate">
                        <div className="flex flex-col gap-0.5 items-center">
                          <span>{item.aircraft}</span>
                          <span className="text-purple">{item.operator}</span>
                        </div>
                      </TableCell>
                      <TableCell className="p-3 text-center">
                        <div className="flex justify-center">
                          <StatusBadge status={item.status} bordered />
                        </div>
                      </TableCell>
                      <TableCell className="p-3 text-center">
                        <div className="flex justify-center">
                          <StatusBadge status={item.clientPmt} bordered />
                        </div>
                      </TableCell>
                      <TableCell className="p-3 font-montserrat font-medium text-[11px] text-muted-foreground text-center whitespace-nowrap">
                        {item.fet}
                      </TableCell>
                      <TableCell className="p-3 font-montserrat font-bold text-[11px] text-success text-center whitespace-nowrap">
                        {item.profit}
                      </TableCell>
                      <TableCell className="p-3 text-center">
                        <div className="flex justify-center">
                          <RowActionsMenu
                            items={[
                              { label: "View Trip", onSelect: () => {} },
                              { label: "Edit Trip", onSelect: () => {} },
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
            {totalProfit && (
              <div className="flex items-center justify-between p-3 px-6 bg-secondary/20 border-t border-border font-montserrat text-[12px]">
                <span className="font-bold text-foreground">Total ({trips.length} trips)</span>
                <span className="font-bold text-foreground">{totalProfit}</span>
              </div>
            )}
          </div>

          {/* Mobile Trips Presentation (lg:hidden) */}
          <div className="flex flex-col gap-3 w-full lg:hidden">
            {trips.map((item, idx) => (
              <div
                key={item.id || idx}
                className="flex flex-col gap-2.5 p-3.5 bg-white border border-border rounded-lg shadow-card text-[12px] font-montserrat"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple text-[13px]">{item.id}</span>
                  <StatusBadge status={item.status} bordered />
                </div>
                <div className="flex items-center justify-between text-foreground font-semibold border-b border-border/40 pb-2">
                  <span>{item.from} → {item.to}</span>
                  <span className="text-muted-foreground font-normal">{item.departure}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span>{item.aircraft} • {item.operator}</span>
                  <StatusBadge status={item.clientPmt} bordered />
                </div>
                <div className="flex items-center justify-between border-t border-border/40 pt-2">
                  <div>
                    <span className="text-muted-foreground text-[10px]">Profit: </span>
                    <span className="font-bold text-success text-[12px]">{item.profit}</span>
                  </div>
                  <RowActionsMenu
                    items={[
                      { label: "View Trip", onSelect: () => {} },
                      { label: "Edit Trip", onSelect: () => {} },
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
            No trips on record
          </p>
          <p className="font-montserrat text-[12px] text-muted-foreground max-w-sm">
            No active or historical trips recorded for this client yet.
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
