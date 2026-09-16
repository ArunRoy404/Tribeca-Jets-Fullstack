"use client";

import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatUserRole } from "@/lib/user";

/**
 * Values arrive formatted by `toAgentRow`. `conversionRate`, `capacityUsed`
 * and `activeTrips` are em dashes when there is nothing to measure — a broker
 * with no leads yet, no capacity set, or the Trips module not built. Never 0%.
 */
export default function AgentsTableRow({ agent, getRowActions, onSelectAgent }) {
  return (
    <TableRow
      className="border-border cursor-pointer"
      onClick={() => onSelectAgent?.(agent?.id)}
    >
      <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-foreground text-left whitespace-nowrap">
        <div className="flex flex-col">
          <span>{agent?.name}</span>
          {agent?.role ? (
            <span className="text-[11px] font-medium text-muted-foreground">
              {formatUserRole(agent.role)}
            </span>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="p-[10px] font-montserrat text-[12px] text-foreground text-center whitespace-nowrap">
        {agent?.email}
      </TableCell>
      <TableCell className="p-[10px] font-montserrat text-[12px] text-foreground text-center whitespace-nowrap">
        {agent?.phone}
      </TableCell>
      <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-foreground text-center">
        {agent?.activeLeads}
        {agent?.maxActiveLeads !== "—" ? (
          <span className="text-[11px] font-medium text-muted-foreground">
            {" "}
            / {agent.maxActiveLeads}
          </span>
        ) : null}
      </TableCell>
      <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-foreground text-center">
        {agent?.convertedLeads}
      </TableCell>
      <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-purple text-center">
        {agent?.activeTrips}
      </TableCell>
      <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-success text-center">
        {agent?.conversionRate}
      </TableCell>
      <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-foreground text-center">
        {agent?.followUpsDue}
      </TableCell>
      <TableCell className="p-[10px] text-center">
        <div className="flex justify-center">
          {agent?.status ? <StatusBadge status={agent.status} bordered /> : null}
        </div>
      </TableCell>
      <TableCell
        className="p-[10px] text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center">
          <RowActionsMenu items={getRowActions?.(agent)} />
        </div>
      </TableCell>
    </TableRow>
  );
}
