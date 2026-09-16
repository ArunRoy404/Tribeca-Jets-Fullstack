"use client";

import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import ClientFollowUpBanner from "@/components/clients/ClientFollowUpBanner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Hardcoded preview data — will be wired to real API endpoint once trips API is connected
const TRIPS_PREVIEW = [
  {
    id: "TJ-1048",
    broker: "Benny",
    from: "KTEB",
    to: "KPBI",
    departure: "Aug 15, 2026",
    returnDate: "Aug 18, 2026",
    operator: "Jet Aviation",
    aircraft: "Challenger 350",
    status: "Confirmed",
    clientPmt: "Paid",
    fet: "$1,500",
    profit: "$8,500",
  },
  {
    id: "TJ-2402",
    broker: "Benny",
    from: "KTEB",
    to: "KMIA",
    departure: "Aug 20, 2026",
    returnDate: "Aug 23, 2026",
    operator: "Air Charter Group",
    aircraft: "Gulfstream G450",
    status: "Booked",
    clientPmt: "Partially Paid",
    fet: "$2,250",
    profit: "$17,000",
  },
  {
    id: "TJ-2403",
    broker: "Mark",
    from: "KMIA",
    to: "EGLL",
    departure: "Sep 3, 2026",
    returnDate: "Sep 10, 2026",
    operator: "VistaJet",
    aircraft: "Global 7500",
    status: "Booked",
    clientPmt: "Quoted",
    fet: "$2,775",
    profit: "$37,000",
  },
  {
    id: "TJ-2403",
    broker: "Mark",
    from: "KMIA",
    to: "EGLL",
    departure: "Sep 3, 2026",
    returnDate: "Sep 10, 2026",
    operator: "VistaJet",
    aircraft: "Global 7500",
    status: "Booked",
    clientPmt: "Quoted",
    fet: "$2,775",
    profit: "$37,000",
  },
  {
    id: "TJ-2403",
    broker: "Mark",
    from: "KMIA",
    to: "EGLL",
    departure: "Sep 3, 2026",
    returnDate: "Sep 10, 2026",
    operator: "VistaJet",
    aircraft: "Global 7500",
    status: "Booked",
    clientPmt: "Quoted",
    fet: "$2,775",
    profit: "$37,000",
  },
  {
    id: "TJ-2404",
    broker: "Benny",
    from: "KVNY",
    to: "KASE",
    departure: "Aug 20, 2026",
    returnDate: "---",
    operator: "Rocky Mountain",
    aircraft: "Citation CJ3+",
    status: "Confirmed",
    clientPmt: "Paid",
    fet: "$397",
    profit: "$5,300",
  },
];

export default function ClientTripsTab({ onScheduleFollowUp }) {
  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Mobile Trips Presentation (lg:hidden) */}
      <div className="flex flex-col gap-3 w-full lg:hidden">
        {TRIPS_PREVIEW.map((item, idx) => (
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
                <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Aircraft · Operator</TableHead>
                <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Status</TableHead>
                <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Client Pmt</TableHead>
                <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">FET (7.5%)</TableHead>
                <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Profit</TableHead>
                <TableHead className="p-3 font-montserrat font-medium text-[11px] text-foreground text-center">Next Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {TRIPS_PREVIEW.map((item, idx) => (
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
        <div className="flex items-center justify-between p-3 px-6 bg-secondary/20 border-t border-border font-montserrat text-[12px]">
          <span className="font-bold text-foreground">Total (6 trips)</span>
          <span className="font-bold text-foreground">$220,500</span>
        </div>
      </div>

      {/* Follow-up Banner Card */}
      <ClientFollowUpBanner onScheduleFollowUp={onScheduleFollowUp} />
    </div>
  );
}
