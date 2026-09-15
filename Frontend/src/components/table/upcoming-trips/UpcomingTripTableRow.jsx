import StatusBadge from "@/components/common/StatusBadge";
import { TableCell, TableRow } from "@/components/ui/table";

export default function UpcomingTripTableRow({ trip }) {
  return (
    <TableRow className="border-border">
      <TableCell className="p-[10px] font-montserrat font-medium text-[10px] text-foreground">{trip?.trip}</TableCell>
      <TableCell className="p-[10px] font-montserrat font-medium text-[10px] text-foreground text-center">{trip?.date}</TableCell>
      <TableCell className="p-[10px] font-montserrat font-medium text-[10px] text-foreground text-center">{trip?.client}</TableCell>
      <TableCell className="p-[10px] font-montserrat font-medium text-[10px] text-foreground text-center">{trip?.broker}</TableCell>
      <TableCell className="p-[10px] font-montserrat font-medium text-[10px] text-foreground text-center">{trip?.route}</TableCell>
      <TableCell className="p-[10px]">
        <div className="flex flex-col gap-1 font-montserrat font-medium text-[10px] text-foreground">
          <p>{trip?.aircraft}</p>
          <p>{trip?.operator}</p>
        </div>
      </TableCell>
      <TableCell className="p-[10px] text-center">
        <div className="flex justify-center">
          <StatusBadge status={trip?.status} />
        </div>
      </TableCell>
      <TableCell className="p-[10px] text-center">
        <div className="flex justify-center">
          <StatusBadge status={trip?.clientPmt} />
        </div>
      </TableCell>
      <TableCell className="p-[10px] text-center">
        <div className="flex justify-center">
          <StatusBadge status={trip?.opPmt} />
        </div>
      </TableCell>
      <TableCell className="p-[10px] font-montserrat font-bold text-[10px] text-success text-center">{trip?.profit}</TableCell>
    </TableRow>
  );
}
