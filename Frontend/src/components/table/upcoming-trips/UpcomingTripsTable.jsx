"use client";

import { useRouter } from "next/navigation";
import UpcomingTripTableRow from "./UpcomingTripTableRow";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const columns = ["Trip", "Date", "Client", "Broker", "Route", "Aircraft · Operator", "Status", "Client Pmt", "Op Pmt", "Profit"];

export default function UpcomingTripsTable({ trips }) {
  const router = useRouter();
  return (
    <div className="relative w-full overflow-x-auto hidden lg:block">
      <Table className="min-w-[900px]">
        <TableHeader>
          <TableRow className="bg-black/10 border-border hover:bg-black/10">
            {columns?.map((col) => (
              <TableHead key={col} className="p-[10px] font-montserrat font-medium text-[10px] text-foreground text-center whitespace-nowrap h-auto">
                {col}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {trips?.map((t) => (
            <UpcomingTripTableRow
              key={t?.id ?? t?.trip}
              trip={t}
              onClick={t?.id ? () => router.push(`/dashboard/trips/${t.id}`) : undefined}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
