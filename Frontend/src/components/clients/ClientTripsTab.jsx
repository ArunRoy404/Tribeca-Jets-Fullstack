"use client";

import { AlertTriangle, Calendar, Check } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useClientsStore } from "@/store/useClientsStore";

export default function ClientTripsTab({ onScheduleFollowUp }) {
  const tripsHistory = useClientsStore((s) => s.tripsHistory);

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Mobile Card Presentation (lg:hidden) */}
      <div className="flex flex-col gap-3 w-full lg:hidden">
        {tripsHistory.map((item, idx) => (
          <div
            key={idx}
            className="flex flex-col gap-2.5 p-3.5 bg-white border border-border rounded-lg shadow-card text-[12px] font-montserrat"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-purple text-[13px]">{item.id}</span>
              <StatusBadge status={item.status} bordered />
            </div>

            <div className="flex items-center justify-between text-foreground font-semibold border-b border-border/40 pb-2">
              <span>{item.from} → {item.to}</span>
              <span className="font-normal text-muted-foreground text-[11px]">{item.departure}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-muted-foreground block text-[10px]">Aircraft / Operator</span>
                <span className="font-medium text-foreground">{item.aircraftOperator}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Client Payment</span>
                <Badge
                  tone={item.clientPmt === "Paid" ? "success" : item.clientPmt === "Quoted" ? "purple" : "warning"}
                  size="sm"
                  className="font-bold text-[10px]"
                >
                  {item.clientPmt}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border/40 pt-2">
              <div>
                <span className="text-muted-foreground text-[10px]">Profit: </span>
                <span className="font-bold text-success text-[12px]">{item.profit}</span>
              </div>
              <RowActionsMenu
                items={[
                  { label: "View Trip", onSelect: () => alert(`Viewing trip ${item.id}`) },
                  { label: "Edit Trip", onSelect: () => alert(`Editing trip ${item.id}`) },
                ]}
              />
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between p-3 bg-secondary/20 border border-border rounded-lg font-montserrat text-[12px]">
          <span className="font-bold text-foreground">Total (6 trips)</span>
          <span className="font-bold text-foreground">$220,500</span>
        </div>
      </div>

      {/* Desktop Trips Table (hidden lg:block) */}
      <div className="hidden lg:block border border-border rounded-lg bg-white shadow-card overflow-hidden w-full">
        <div className="overflow-x-auto w-full">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow className="bg-black/5 border-border hover:bg-black/5">
                <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Trip ID</TableHead>
                <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Broker</TableHead>
                <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Route</TableHead>
                <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Departure</TableHead>
                <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Return</TableHead>
                <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Aircraft • Operator</TableHead>
                <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Status</TableHead>
                <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Client Pmt</TableHead>
                <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">FET (7.5%)</TableHead>
                <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Profit</TableHead>
                <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Next Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tripsHistory.map((item, idx) => (
                <TableRow key={idx} className="border-border hover:bg-purple/5 transition-colors">
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
                    {item.returnDate}
                  </TableCell>
                  <TableCell className="p-3 font-montserrat text-[11px] text-foreground text-center max-w-40 truncate">
                    {item.aircraftOperator}
                  </TableCell>
                  <TableCell className="p-3 text-center">
                    <div className="flex justify-center">
                      <StatusBadge status={item.status} bordered />
                    </div>
                  </TableCell>
                  <TableCell className="p-3 text-center">
                    <div className="flex justify-center">
                      <Badge
                        tone={item.clientPmt === "Paid" ? "success" : item.clientPmt === "Quoted" ? "purple" : "warning"}
                        size="sm"
                        className="font-bold text-[10px]"
                      >
                        {item.clientPmt}
                      </Badge>
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
                          { label: "View Trip", onSelect: () => alert(`Viewing trip ${item.id}`) },
                          { label: "Edit Trip", onSelect: () => alert(`Editing trip ${item.id}`) },
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
          <span className="font-bold text-foreground">Total (6 trips)</span>
          <span className="font-bold text-foreground">$220,500</span>
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
