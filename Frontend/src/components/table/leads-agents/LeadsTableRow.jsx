"use client";

import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import RestoredBadge from "@/components/common/RestoredBadge";
import { TableCell, TableRow } from "@/components/ui/table";

/**
 * Every value arrives already formatted by `toLeadRow` — an absent one is an
 * em dash — so this renders what it is given and adds no fallback of its own.
 *
 * `route` and the estimated value come from the lead's most recent enquiry.
 * When there is no enquiry yet they read "—" rather than inventing a route,
 * which is what the old dummy-backed table did for every row.
 */
export default function LeadsTableRow({
  lead,
  getRowActions,
  onSelectLead,
  archived = false,
}) {
  return (
    <TableRow
      className="border-border cursor-pointer"
      onClick={() => onSelectLead?.(lead?.id)}
    >
      <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-foreground text-left whitespace-nowrap">
        <div className="flex flex-col">
          <span className="inline-flex items-center gap-2">
            {lead?.name}
            {lead?.isRestored ? (
              <RestoredBadge at={lead?.restoredAtLabel} by={lead?.restoredByName} />
            ) : null}
          </span>
          {lead?.company && lead.company !== "—" ? (
            <span className="text-[11px] font-medium text-muted-foreground">
              {lead.company}
            </span>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="p-[10px] font-montserrat text-[12px] text-foreground text-center whitespace-nowrap">
        {lead?.email}
      </TableCell>
      <TableCell className="p-[10px] font-montserrat text-[12px] text-foreground text-center whitespace-nowrap">
        {lead?.phone}
      </TableCell>
      <TableCell className="p-[10px] font-montserrat font-medium text-[12px] text-foreground text-center whitespace-nowrap">
        {lead?.source}
      </TableCell>
      <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-foreground text-center whitespace-nowrap">
        {lead?.route}
      </TableCell>
      <TableCell className="p-[10px] text-center">
        <div className="flex justify-center">
          {lead?.priority ? <StatusBadge status={lead.priority} bordered /> : null}
        </div>
      </TableCell>
      <TableCell className="p-[10px] font-montserrat font-semibold text-[12px] text-purple text-center whitespace-nowrap">
        {archived ? lead?.deletedAtLabel : lead?.brokerName}
      </TableCell>
      <TableCell className="p-[10px] font-montserrat text-[12px] text-foreground text-center whitespace-nowrap">
        {archived ? (
          lead?.deletedByName
        ) : (
          <div className="flex flex-col">
            <span className="font-semibold">{lead?.nextFollowUp}</span>
            {lead?.followUpMethod ? (
              <span className="text-[11px] text-muted-foreground">
                {lead.followUpMethod}
              </span>
            ) : null}
          </div>
        )}
      </TableCell>
      <TableCell className="p-[10px] text-center">
        <div className="flex justify-center">
          {lead?.stage ? <StatusBadge status={lead.stage} bordered /> : null}
        </div>
      </TableCell>
      <TableCell
        className="p-[10px] text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center">
          <RowActionsMenu items={getRowActions?.(lead)} />
        </div>
      </TableCell>
    </TableRow>
  );
}
