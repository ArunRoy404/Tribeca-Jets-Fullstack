"use client";

import { Plane, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * OperatorFleetTab
 *
 * NOTE FOR AI AGENTS / DEVELOPERS:
 * DO NOT DELETE THIS COMPONENT OR ITS TABLE MARKUP.
 *
 * Current API status:
 * - The Aircraft module stores `operatorId` foreign keys on tails.
 * - When an operator has aircraft tails in the database, `operator.fleet` returns them.
 * - When an operator has no aircraft tails assigned yet (`fleet.length === 0`), this component
 *   renders an honest empty state ("No Aircraft in Fleet") per CRM guidelines.
 *
 * INSTRUCTIONS FOR WIRING THE API:
 * 1. Data source: `operator.fleet` (mapped via `toAircraftRow`).
 * 2. When aircraft exist for this operator, the pre-styled table renders automatically.
 * 3. Expected item wire shape:
 *    - model: string (e.g. "Global 7500")
 *    - category: string (e.g. "Ultra Long Range")
 *    - tailNumber: string (e.g. "N785EX")
 *    - maxPassengers: string
 *    - range: string
 *    - totalTrips: string
 *    - status: string ("Available", "In Service")
 */

/*
// PREVIOUS HARDCODED MOCK DATA (KEPT FOR REFERENCE ONLY — DO NOT USE IN PRODUCTION):
// const defaultFleet = [
//   { id: "f-1", model: "Global 7500", category: "Ultra Long Range", tailNumber: "N785EX", maxPassengers: "16 pax", range: "7,700", totalTrips: "18", status: "In Service" },
//   { id: "f-2", model: "Challenger 350", category: "Super Midsize", tailNumber: "N680EX", maxPassengers: "9 pax", range: "3,500", totalTrips: "22", status: "Available" },
//   { id: "f-3", model: "Legacy 600", category: "Heavy Jet", tailNumber: "N180EX", maxPassengers: "13 pax", range: "3,900", totalTrips: "22", status: "Available" },
// ];
*/

export default function OperatorFleetTab({ operator }) {
  const fleet = operator?.fleet || [];

  // Honest empty state when no aircraft are registered to this operator
  if (fleet.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-lg border border-border w-full shadow-card">
        <div className="size-12 rounded-full bg-secondary flex items-center justify-center text-muted-foreground mb-3">
          <Plane className="size-6 text-muted-foreground" />
        </div>
        <p className="font-montserrat font-bold text-[16px] text-foreground">
          No Aircraft in Fleet
        </p>
        <p className="font-montserrat text-[13px] text-muted-foreground mt-1 max-w-sm">
          No aircraft tails are registered to this operator in the database yet.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full bg-white rounded-lg border border-border overflow-hidden shadow-card">
      <div className="overflow-x-auto w-full">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow className="bg-secondary/40 border-b border-border hover:bg-secondary/40">
              <TableHead className="py-3 px-4 font-montserrat font-bold text-[12px] text-foreground text-left">
                Aircraft
              </TableHead>
              <TableHead className="py-3 px-4 font-montserrat font-bold text-[12px] text-foreground text-left">
                Type
              </TableHead>
              <TableHead className="py-3 px-4 font-montserrat font-bold text-[12px] text-foreground text-left">
                Tail #
              </TableHead>
              <TableHead className="py-3 px-4 font-montserrat font-bold text-[12px] text-foreground text-left">
                Capacity
              </TableHead>
              <TableHead className="py-3 px-4 font-montserrat font-bold text-[12px] text-foreground text-left">
                Range ( NM )
              </TableHead>
              <TableHead className="py-3 px-4 font-montserrat font-bold text-[12px] text-foreground text-center">
                Trips
              </TableHead>
              <TableHead className="py-3 px-4 font-montserrat font-bold text-[12px] text-foreground text-center">
                Status
              </TableHead>
              <TableHead className="py-3 px-4 font-montserrat font-bold text-[12px] text-foreground text-center">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fleet.map((ac) => {
              const isAvailable = ac.status?.toLowerCase?.() === "available";
              return (
                <TableRow
                  key={ac.id || ac.tailNumber}
                  className="border-b border-border/60 hover:bg-secondary/20 transition-colors"
                >
                  <TableCell className="py-3.5 px-4 text-left">
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-full bg-purple/10 flex items-center justify-center text-purple shrink-0">
                        <Plane className="size-3.5" />
                      </div>
                      <span className="font-montserrat font-bold text-[13px] text-purple">
                        {ac.model}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3.5 px-4 font-montserrat font-medium text-[13px] text-foreground text-left">
                    {ac.category}
                  </TableCell>
                  <TableCell className="py-3.5 px-4 font-montserrat font-bold text-[13px] text-foreground text-left">
                    {ac.tailNumber}
                  </TableCell>
                  <TableCell className="py-3.5 px-4 font-montserrat font-medium text-[13px] text-foreground text-left">
                    {ac.maxPassengers}
                  </TableCell>
                  <TableCell className="py-3.5 px-4 font-montserrat font-medium text-[13px] text-foreground text-left">
                    {ac.range}
                  </TableCell>
                  <TableCell className="py-3.5 px-4 font-montserrat font-bold text-[13px] text-foreground text-center">
                    {ac.totalTrips || "—"}
                  </TableCell>
                  <TableCell className="py-3.5 px-4 text-center">
                    <div className="flex justify-center">
                      <span
                        className={`px-2.5 py-0.5 rounded font-montserrat font-medium text-[11px] border ${
                          isAvailable
                            ? "bg-success/10 text-success border-success/30"
                            : "bg-muted/60 text-muted-foreground border-border"
                        }`}
                      >
                        {ac.status}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3.5 px-4 text-center">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center size-8 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      <MoreHorizontal className="size-4" />
                    </button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-border bg-white text-[12px] font-montserrat">
        <span className="text-muted-foreground font-medium">
          {fleet.length} {fleet.length === 1 ? "aircraft" : "aircraft"}
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-[12px] font-medium gap-1 cursor-pointer"
            disabled
          >
            ← Prev
          </Button>
          <button
            type="button"
            className="size-8 rounded-sm bg-[#252832] text-white font-bold text-[12px] flex items-center justify-center cursor-pointer"
          >
            1
          </button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-[12px] font-medium gap-1 cursor-pointer"
            disabled
          >
            Next →
          </Button>
        </div>
      </div>
    </div>
  );
}
