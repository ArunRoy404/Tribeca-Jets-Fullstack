import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { TableCell, TableRow } from "@/components/ui/table";

export default function TripsTableRow({ trip, onSelectTrip, getRowActions }) {
  return (
    <TableRow
      key={trip?.id}
      className="border-border cursor-pointer hover:bg-secondary/30"
      onClick={() => onSelectTrip?.(trip)}
    >
      <TableCell className="p-[10px] font-montserrat font-semibold text-[10px] text-purple">{trip?.id}</TableCell>
      <TableCell className="p-[10px] font-montserrat font-medium text-[10px] text-foreground text-center">{trip?.client}</TableCell>
      <TableCell className="p-[10px] font-montserrat font-medium text-[10px] text-foreground text-center">{trip?.broker}</TableCell>
      <TableCell className="p-[10px] font-montserrat font-medium text-[10px] text-foreground text-center whitespace-nowrap">
        {trip?.from} → {trip?.to}
      </TableCell>
      <TableCell className="p-[10px] font-montserrat font-medium text-[10px] text-foreground text-center whitespace-nowrap">{trip?.departure}</TableCell>
      <TableCell className="p-[10px] font-montserrat font-medium text-[10px] text-foreground text-center whitespace-nowrap">{trip?.return}</TableCell>
      <TableCell className="p-[10px]">
        <div className="flex flex-col gap-1 font-montserrat font-medium text-[10px] text-foreground whitespace-nowrap">
          <p>{trip?.aircraft}</p>
          <p className="text-purple">{trip?.operator}</p>
        </div>
      </TableCell>
      <TableCell className="p-[10px] text-center">
        <div className="flex justify-center">
          <StatusBadge status={trip?.status} bordered />
        </div>
      </TableCell>
      <TableCell className="p-[10px] text-center">
        <div className="flex justify-center">
          <StatusBadge status={trip?.clientPmt} bordered />
        </div>
      </TableCell>
      <TableCell className="p-[10px] text-center">
        <div className="flex justify-center">
          <StatusBadge status={trip?.opPmt} bordered />
        </div>
      </TableCell>
      <TableCell className="p-[10px] font-montserrat font-medium text-[10px] text-foreground text-center whitespace-nowrap">{trip?.fet}</TableCell>
      <TableCell className="p-[10px] font-montserrat font-bold text-[10px] text-success text-center whitespace-nowrap">{trip?.profit}</TableCell>
      <TableCell className="p-[10px] font-montserrat font-medium text-[10px] text-purple text-center whitespace-nowrap">{trip?.nextAction}</TableCell>
      <TableCell className="p-[10px] text-center">
        <div className="flex justify-center">
          <RowActionsMenu items={getRowActions?.(trip)} />
        </div>
      </TableCell>
    </TableRow>
  );
}
