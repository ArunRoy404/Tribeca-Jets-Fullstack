"use client";

import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { TableCell, TableRow } from "@/components/ui/table";

export default function OperatorPaymentsTableRow({ item, getRowActions, onSelectPayment }) {
  return (
    <TableRow
      key={item?.id}
      className="border-border cursor-pointer hover:bg-purple/5 transition-colors"
      onClick={() => onSelectPayment?.(item?.id)}
    >
      <TableCell className="p-[12px] font-montserrat font-semibold text-[11px] text-foreground">
        {item?.operator}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-semibold text-[11px] text-purple">
        {item?.tripId}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-bold text-[11px] text-foreground">
        {item?.amount}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-bold text-[11px] text-success whitespace-nowrap">
        {item?.paid}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-bold text-[11px] text-destructive whitespace-nowrap">
        {item?.balance}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-medium text-[11px] text-foreground whitespace-nowrap">
        {item?.due}
      </TableCell>
      <TableCell className="p-[12px]">
        {item?.status && <StatusBadge status={item?.status} bordered />}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-medium text-[11px] text-foreground">
        {item?.broker}
      </TableCell>
      <TableCell className="p-[12px]" onClick={(e) => e.stopPropagation()}>
        <RowActionsMenu items={getRowActions?.(item)} />
      </TableCell>
    </TableRow>
  );
}
