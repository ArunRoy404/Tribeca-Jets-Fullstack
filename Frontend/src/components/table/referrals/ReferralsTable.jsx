"use client";

import StatusBadge from "@/components/common/StatusBadge";
import RestoredBadge from "@/components/common/RestoredBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const BASE_COLUMNS = ["ID", "Client", "Agent", "Route", "Departure", "Pax"];
const LIVE_TAIL = ["Broker", "Status", ""];
const ARCHIVED_TAIL = ["Removed On", "Removed By", ""];
const CELL = "p-[12px] font-montserrat text-[12px] whitespace-nowrap";
/** The agent's own list in the portal (#11): no agent, no broker, no actions. */
const PARTNER_COLUMNS = ["ID", "Client", "Route", "Departure", "Pax", "Submitted", "Status"];

/**
 * The referrals table — the desk's board, or with `partner` the agent's "My
 * Referrals" in the portal, which shows what they sent and where it stands and
 * nothing the desk keeps to itself.
 */
export default function ReferralsTable({
  pageItems,
  getRowActions,
  onSelectReferral,
  selected,
  onToggleRow,
  onSelectAll,
  selectable = false,
  archived = false,
  partner = false,
}) {
  const columns = partner ? PARTNER_COLUMNS : [...BASE_COLUMNS, ...(archived ? ARCHIVED_TAIL : LIVE_TAIL)];

  return (
    <div className="relative w-full overflow-x-auto hidden lg:block">
      <Table className={partner ? "min-w-[760px]" : "min-w-[1000px]"}>
        <TableHeader>
          <TableRow className="bg-black/5 border-border hover:bg-black/5">
            {selectable && (
              <TableHead className="w-10 p-[12px]">
                <Checkbox
                  checked={selected?.size === pageItems?.length && pageItems?.length > 0}
                  onCheckedChange={onSelectAll}
                  aria-label="Select every referral on this page"
                />
              </TableHead>
            )}
            {columns.map((col, idx) => (
              <TableHead key={`${col}-${idx}`} className="p-[12px] font-montserrat font-semibold text-[12px] text-foreground whitespace-nowrap h-auto">
                {col}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageItems?.map((item) => (
            <TableRow
              key={item?.id}
              className="border-border cursor-pointer hover:bg-purple/5 transition-colors"
              onClick={() => onSelectReferral?.(item?.id)}
            >
              {selectable && (
                <TableCell className="p-[12px] w-10" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={Boolean(selected?.has?.(item?.id))}
                    onCheckedChange={() => onToggleRow?.(item?.id)}
                    aria-label={`Select referral ${item?.reference}`}
                  />
                </TableCell>
              )}
              <TableCell className={`${CELL} font-semibold text-purple`}>
                <div className="flex items-center gap-2">
                  {item?.reference}
                  {item?.isRestored && <RestoredBadge at={item?.restoredAt} by={item?.restoredByName} />}
                </div>
              </TableCell>
              <TableCell className={`${CELL} font-bold text-foreground`}>{item?.clientName}</TableCell>
              {!partner && <TableCell className={`${CELL} text-foreground`}>{item?.agent}</TableCell>}
              <TableCell className={`${CELL} font-semibold text-foreground`}>{item?.route}</TableCell>
              <TableCell className={`${CELL} text-muted-foreground`}>{item?.departure}</TableCell>
              <TableCell className={`${CELL} text-foreground`}>{item?.passengers}</TableCell>
              {partner ? (
                <>
                  <TableCell className={`${CELL} text-muted-foreground`}>{item?.submittedAt}</TableCell>
                  <TableCell className="p-[12px]">
                    <StatusBadge status={item?.status} bordered />
                  </TableCell>
                </>
              ) : archived ? (
                <>
                  <TableCell className={`${CELL} text-muted-foreground`}>{item?.deletedAtLabel}</TableCell>
                  <TableCell className={`${CELL} text-foreground`}>{item?.deletedByName}</TableCell>
                </>
              ) : (
                <>
                  <TableCell className={`${CELL} text-foreground`}>{item?.broker}</TableCell>
                  <TableCell className="p-[12px]">
                    <StatusBadge status={item?.status} bordered />
                  </TableCell>
                </>
              )}
              {!partner && (
                <TableCell className="p-[12px]" onClick={(e) => e.stopPropagation()}>
                  <RowActionsMenu items={getRowActions?.(item)} />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
