"use client";

import Link from "next/link";
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
 * OperatorTripsTab
 *
 * NOTE FOR AI AGENTS / DEVELOPERS:
 * DO NOT DELETE THIS COMPONENT OR ITS TABLE MARKUP.
 *
 * Current API status:
 * - The backend Trips module does not yet have a cross-module query linking trips to operators.
 * - `operator.tripHistory` returns empty array `[]`.
 * - When `trips.length === 0`, this component renders an honest empty state ("No Trip History")
 *   per the CRM core rule: "Never display a number the data did not supply".
 *
 * INSTRUCTIONS FOR WIRING THE API:
 * 1. Data source: `operator.tripHistory` or `GET /api/trips?operatorId={operator.id}`.
 * 2. When data is returned, this component will automatically render the pre-styled table below.
 * 3. Expected item wire shape:
 *    - tripId: string (e.g. "TJ-1048")
 *    - client: string
 *    - broker: string
 *    - route: string (e.g. "KTEB → KPBI")
 *    - departure: string
 *    - returnDate: string
 *    - aircraft: string
 *    - status: string
 *    - profit: string
 */

/*
// PREVIOUS HARDCODED MOCK DATA (KEPT FOR REFERENCE ONLY — DO NOT USE IN PRODUCTION):
// const defaultTrips = [
//   { id: "t-1", tripId: "#TJ-1048", client: "Jonathan Reed", broker: "Benny", route: "KTEB → KPBI", departure: "Aug 15, 2026", returnDate: "Aug 18, 2026", aircraft: "Jet Aviation", status: "Confirmed", profit: "$8,500" },
//   { id: "t-2", tripId: "TJ-2402", client: "Hope Sterling", broker: "Benny", route: "KTEB → KMIA", departure: "Aug 20, 2026", returnDate: "Aug 23, 2026", aircraft: "Air Charter Group", status: "Booked", profit: "$17,000" },
//   { id: "t-3", tripId: "TJ-2403", client: "Emily Carter", broker: "Mark", route: "KMIA → EGLL", departure: "Sep 3, 2026", returnDate: "Sep 10, 2026", aircraft: "VistaJet", status: "Booked", profit: "$37,000" },
// ];
*/

export default function OperatorTripsTab({ operator }) {
  const trips = operator?.tripHistory || [];

  // Honest empty state when no trips exist in database for this operator
  if (trips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-lg border border-border w-full shadow-card">
        <div className="size-12 rounded-full bg-secondary flex items-center justify-center text-muted-foreground mb-3">
          <Plane className="size-6 text-muted-foreground" />
        </div>
        <p className="font-montserrat font-bold text-[16px] text-foreground">
          No Trip History
        </p>
        <p className="font-montserrat text-[13px] text-muted-foreground mt-1 max-w-sm">
          No trip records have been associated with this operator yet.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full bg-white rounded-lg border border-border overflow-hidden shadow-card">
      <div className="overflow-x-auto w-full">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow className="bg-secondary/40 border-b border-border hover:bg-secondary/40">
              <TableHead className="py-3 px-4 font-montserrat font-bold text-[12px] text-foreground text-left">
                Trip ID
              </TableHead>
              <TableHead className="py-3 px-4 font-montserrat font-bold text-[12px] text-foreground text-left">
                Client
              </TableHead>
              <TableHead className="py-3 px-4 font-montserrat font-bold text-[12px] text-foreground text-left">
                Broker
              </TableHead>
              <TableHead className="py-3 px-4 font-montserrat font-bold text-[12px] text-foreground text-left">
                Route
              </TableHead>
              <TableHead className="py-3 px-4 font-montserrat font-bold text-[12px] text-foreground text-left">
                Departure
              </TableHead>
              <TableHead className="py-3 px-4 font-montserrat font-bold text-[12px] text-foreground text-left">
                Return
              </TableHead>
              <TableHead className="py-3 px-4 font-montserrat font-bold text-[12px] text-foreground text-left">
                Aircraft
              </TableHead>
              <TableHead className="py-3 px-4 font-montserrat font-bold text-[12px] text-foreground text-center">
                Status
              </TableHead>
              <TableHead className="py-3 px-4 font-montserrat font-bold text-[12px] text-foreground text-center">
                Profit
              </TableHead>
              <TableHead className="py-3 px-4 font-montserrat font-bold text-[12px] text-foreground text-center">
                Next Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trips.map((tr) => (
              <TableRow
                key={tr.id || tr.tripId}
                className="border-b border-border/60 hover:bg-secondary/20 transition-colors"
              >
                <TableCell className="py-3.5 px-4 text-left">
                  <Link
                    href={`/dashboard/trips/${encodeURIComponent(String(tr.tripId || tr.id).replace("#", ""))}`}
                    className="font-montserrat font-bold text-[13px] text-purple hover:underline"
                  >
                    {tr.tripId || tr.id}
                  </Link>
                </TableCell>
                <TableCell className="py-3.5 px-4 font-montserrat font-semibold text-[13px] text-foreground text-left">
                  {tr.client}
                </TableCell>
                <TableCell className="py-3.5 px-4 font-montserrat font-medium text-[13px] text-foreground text-left">
                  {tr.broker}
                </TableCell>
                <TableCell className="py-3.5 px-4 font-montserrat font-medium text-[13px] text-foreground text-left">
                  {tr.route}
                </TableCell>
                <TableCell className="py-3.5 px-4 font-montserrat font-medium text-[13px] text-foreground text-left">
                  {tr.departure}
                </TableCell>
                <TableCell className="py-3.5 px-4 font-montserrat font-medium text-[13px] text-foreground text-left">
                  {tr.returnDate || "—"}
                </TableCell>
                <TableCell className="py-3.5 px-4 font-montserrat font-medium text-[13px] text-foreground text-left">
                  {tr.aircraft}
                </TableCell>
                <TableCell className="py-3.5 px-4 text-center">
                  <div className="flex justify-center">
                    <span className="px-2.5 py-0.5 rounded font-montserrat font-medium text-[11px] border bg-info/10 text-info border-info/30">
                      {tr.status}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-3.5 px-4 font-montserrat font-bold text-[13px] text-success text-center">
                  {tr.profit}
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
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-border bg-white text-[12px] font-montserrat">
        <span className="text-muted-foreground font-medium">
          {trips.length} {trips.length === 1 ? "trip" : "trips"}
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
