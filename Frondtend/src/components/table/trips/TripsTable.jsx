import TripsTableRow from "./TripsTableRow";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const columns = [
  "Trip ID",
  "Client",
  "Broker",
  "Route",
  "Departure",
  "Return",
  "Aircraft · Operator",
  "Status",
  "Client Pmt",
  "Op Pmt",
  "FET (7.5%)",
  "Profit",
  "Next Action",
  "",
];

export default function TripsTable({ pageTrips, onSelectTrip, getRowActions }) {
  return (
    <div className="relative w-full overflow-x-auto hidden lg:block">
      <Table className="min-w-[1100px]">
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
          {pageTrips?.map((t) => (
            <TripsTableRow key={t?.id} trip={t} onSelectTrip={onSelectTrip} getRowActions={getRowActions} />
          ))}
          {pageTrips?.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns?.length} className="p-6 text-center font-montserrat text-[12px] text-muted-foreground">
                No trips match the current filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
