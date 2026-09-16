"use client";

import Image from "next/image";
import { Plane, Eye, FileText } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import TablePagination from "@/components/table/common/TablePagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const columns = [
  "Aircraft Model",
  "Category",
  "Tail #",
  "Capacity",
  "Range",
  "Year",
  "Trips",
  "Status",
  "Action",
];

export default function OperatorFleetTab({ operator }) {
  const fleet = operator?.fleet || [];

  if (fleet.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-md border border-border w-full">
        <Plane className="size-10 text-muted-foreground/50 mb-3" />
        <p className="font-montserrat font-bold text-[16px] text-foreground">No Aircraft in Fleet</p>
        <p className="font-montserrat text-[13px] text-muted-foreground mt-1">
          No fleet aircraft records have been registered for this operator yet.
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-start rounded-md border border-border overflow-hidden w-full">
      <Image
        src="/dashboard/bg/trips-table.png"
        alt=""
        fill
        className="object-cover opacity-50 pointer-events-none"
        sizes="1600px"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-white/90 to-[#e5eeff]/90 backdrop-blur-2xl pointer-events-none" />

      {/* Mobile Card List (< lg) */}
      <div className="relative w-full lg:hidden flex flex-col gap-2 p-3">
        {fleet.map((ac) => (
          <div
            key={ac.id}
            className="flex flex-col gap-2.5 items-start p-3 w-full rounded-sm border border-border bg-white"
          >
            <div className="flex items-center justify-between gap-2 w-full">
              <div className="flex items-center gap-2 min-w-0">
                <Plane className="size-4 text-purple shrink-0" />
                <p className="font-montserrat font-semibold text-[13px] text-purple truncate">{ac.model}</p>
              </div>
              <StatusBadge status={ac.status} bordered />
            </div>

            <div className="grid grid-cols-2 gap-3 w-full text-[12px] font-montserrat">
              <div>
                <span className="text-muted-foreground text-[10px] block">Category / Tail #</span>
                <span className="font-bold text-foreground">{ac.category} · {ac.tailNumber}</span>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground text-[10px] block">Capacity / Range</span>
                <span className="font-bold text-foreground">{ac.maxPassengers} · {ac.range}</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 w-full pt-2 border-t border-border text-[12px] font-montserrat">
              <span className="text-muted-foreground">Year: <strong className="text-foreground">{ac.yearBuilt}</strong></span>
              <span className="text-muted-foreground">Trips: <strong className="text-foreground">{ac.totalTrips}</strong></span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table (>= lg) */}
      <div className="relative w-full overflow-x-auto hidden lg:block">
        <Table className="min-w-[1000px]">
          <TableHeader>
            <TableRow className="bg-black/10 border-border hover:bg-black/10">
              {columns.map((col) => (
                <TableHead key={col} className="p-[10px] font-montserrat font-bold text-[12px] text-foreground text-center whitespace-nowrap h-auto">
                  {col}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {fleet.map((ac) => (
              <TableRow key={ac.id} className="border-border hover:bg-secondary/40 transition-colors">
                <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-foreground text-left">
                  <div className="flex items-center gap-2">
                    <Plane className="size-3.5 text-purple shrink-0" />
                    <span>{ac.model}</span>
                  </div>
                </TableCell>
                <TableCell className="p-[10px] font-montserrat font-semibold text-[12px] text-foreground text-center">{ac.category}</TableCell>
                <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-foreground text-center">{ac.tailNumber}</TableCell>
                <TableCell className="p-[10px] font-montserrat font-semibold text-[12px] text-foreground text-center">{ac.maxPassengers}</TableCell>
                <TableCell className="p-[10px] font-montserrat font-semibold text-[12px] text-foreground text-center">{ac.range}</TableCell>
                <TableCell className="p-[10px] font-montserrat font-semibold text-[12px] text-foreground text-center">{ac.yearBuilt}</TableCell>
                <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-purple text-center">
                  {ac.totalTrips}
                </TableCell>
                <TableCell className="p-[10px] text-center">
                  <div className="flex justify-center">
                    <StatusBadge status={ac.status} bordered />
                  </div>
                </TableCell>
                <TableCell className="p-[10px] text-center">
                  <div className="flex justify-center">
                    <RowActionsMenu
                      items={[
                        { label: "View Specs", icon: <Eye /> },
                        { label: "Request Aircraft Quote", icon: <FileText /> },
                      ]}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="relative w-full">
        <TablePagination totalCount={fleet.length} itemLabel="aircraft" page={1} pageCount={1} onPrev={() => {}} onNext={() => {}} />
      </div>
    </div>
  );
}
