"use client";

import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { TableCell, TableRow } from "@/components/ui/table";
import RoleBadge from "@/components/users-roles/RoleBadge";

export default function UsersTableRow({ item, getRowActions, onSelectUser }) {
  return (
    <TableRow
      key={item?.id}
      className="border-border cursor-pointer hover:bg-purple/5 transition-colors"
      onClick={() => onSelectUser?.(item?.id)}
    >
      <TableCell className="p-[12px] font-montserrat font-bold text-[11px] text-foreground">
        {item?.name}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-medium text-[11px] text-muted-foreground whitespace-nowrap">
        {item?.email}
      </TableCell>
      <TableCell className="p-[12px]">
        <RoleBadge role={item?.role} />
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-medium text-[11px] text-foreground">
        {item?.permissionLevel}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-bold text-[11px] text-purple text-center">
        {item?.activeLeads}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-bold text-[11px] text-purple text-center">
        {item?.activeTrips}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-medium text-[11px] text-foreground text-center">
        {item?.conversionRate}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-bold text-[11px] text-success whitespace-nowrap">
        {item?.revenue}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-medium text-[11px] text-muted-foreground whitespace-nowrap">
        {item?.lastLogin}
      </TableCell>
      <TableCell className="p-[12px]">
        {item?.status && <StatusBadge status={item?.status} bordered />}
      </TableCell>
      <TableCell className="p-[12px]" onClick={(e) => e.stopPropagation()}>
        <RowActionsMenu items={getRowActions?.(item)} />
      </TableCell>
    </TableRow>
  );
}
