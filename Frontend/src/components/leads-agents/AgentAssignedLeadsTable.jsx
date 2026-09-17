"use client";

import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, UserX } from "lucide-react";

const COLUMNS = [
  "Lead",
  "Company",
  "Contact",
  "Source",
  "Interest / Route",
  "Priority",
  "Next Follow-up",
  "Status",
  "Created",
  "Next Action",
];

/**
 * AgentAssignedLeadsTable
 *
 * API Integration Guidelines:
 * - Data source: `leads` list fetched from `useClients({ status: "LEAD", assignedBrokerId: agentId, limit: 50 })`
 *   which queries `GET /api/clients?status=LEAD&assignedBrokerId={agentId}`
 * - Each lead item is transformed via `toLeadRow(client, latestRequest)` in `@/lib/lead.js`
 * - Actions:
 *   - "View Lead" -> navigates to `/dashboard/leads-agents/leads/{id}`
 *   - "Schedule Follow-up" -> opens ScheduleFollowUpDialog with client context
 *   - "Convert to Client" -> opens ConvertLeadDialog with client context
 *
 * When no leads are assigned to the broker, renders an honest empty state.
 */
export default function AgentAssignedLeadsTable({
  leads = [],
  agentName,
  onSelectLead,
  onScheduleFollowUp,
  onConvertLead,
  onPageChange,
  meta,
}) {
  const count = leads.length;
  const page = meta?.page || 1;
  const totalPages = Math.max(meta?.totalPages || 1, 1);
  const totalCount = meta?.total !== undefined ? meta.total : count;

  /**
   * One definition of what a row can do, so the desktop table and the mobile
   * cards offer the same menu. They had drifted: the table listed three
   * actions, two of which did nothing, and the cards listed one.
   */
  const rowActions = (item) => [
    { label: "View Lead", onSelect: () => onSelectLead?.(item.id) },
    { label: "Schedule Follow-up", onSelect: () => onScheduleFollowUp?.(item) },
    { label: "Convert to Client", onSelect: () => onConvertLead?.(item) },
  ];

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex items-center justify-between">
        <h3 className="font-montserrat font-bold text-[14px] text-foreground">
          {count} {count === 1 ? "lead" : "leads"}
          {agentName ? ` assigned to ${agentName}` : " assigned"}
        </h3>
      </div>

      <div className="rounded-lg border border-border bg-white shadow-card overflow-hidden w-full">
        {count === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-white w-full">
            <div className="size-10 rounded-full bg-secondary/60 flex items-center justify-center text-muted-foreground mb-3">
              <UserX className="size-5" />
            </div>
            <p className="font-montserrat font-bold text-[15px] text-foreground">
              No Leads Assigned
            </p>
            <p className="font-montserrat text-[12px] text-muted-foreground mt-1 max-w-sm">
              Leads assigned to this broker will appear in this table once assigned or created.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table view */}
            <div className="relative w-full overflow-x-auto hidden lg:block">
              <Table className="min-w-[1000px]">
                <TableHeader>
                  <TableRow className="bg-black/5 border-border hover:bg-black/5">
                    {COLUMNS.map((col) => (
                      <TableHead
                        key={col}
                        className="p-3 font-montserrat font-bold text-[11px] text-foreground text-center whitespace-nowrap h-auto"
                      >
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((item) => (
                    <TableRow
                      key={item.id}
                      className="border-border hover:bg-purple/5 transition-colors cursor-pointer"
                      onClick={() => onSelectLead?.(item.id)}
                    >
                      <TableCell className="p-3 font-montserrat font-bold text-[12px] text-foreground text-left whitespace-nowrap">
                        {item.name}
                      </TableCell>
                      <TableCell className="p-3 font-montserrat font-medium text-[12px] text-foreground text-center whitespace-nowrap">
                        {item.company || "—"}
                      </TableCell>
                      <TableCell className="p-3 font-montserrat text-[11px] text-foreground text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="truncate max-w-[140px]">{item.email}</span>
                          <span className="text-muted-foreground text-[10px]">{item.phone}</span>
                        </div>
                      </TableCell>
                      <TableCell className="p-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded border border-border bg-secondary/30 font-montserrat text-[11px] text-muted-foreground">
                          {item.source || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="p-3 font-montserrat font-semibold text-[11px] text-foreground text-center whitespace-nowrap">
                        {item.route || "—"}
                      </TableCell>
                      <TableCell className="p-3 text-center">
                        <div className="flex justify-center">
                          {item.priority ? (
                            <StatusBadge status={item.priority} bordered />
                          ) : (
                            <span>—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="p-3 font-montserrat text-[11px] text-foreground text-center whitespace-nowrap">
                        {item.nextFollowUp || "—"}
                      </TableCell>
                      <TableCell className="p-3 text-center">
                        <div className="flex justify-center">
                          {item.stage || item.status ? (
                            <StatusBadge status={item.stage || item.status} bordered />
                          ) : (
                            <span>—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="p-3 font-montserrat text-[11px] text-muted-foreground text-center whitespace-nowrap">
                        {item.createdAt || item.created || "—"}
                      </TableCell>
                      <TableCell
                        className="p-3 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex justify-center">
                          <RowActionsMenu items={rowActions(item)} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards view (<lg) */}
            <div className="flex flex-col divide-y divide-border lg:hidden">
              {leads.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 flex flex-col gap-2 font-montserrat text-[12px] bg-white hover:bg-muted/10 transition-colors"
                  onClick={() => onSelectLead?.(item.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[13px] text-foreground">{item.name}</span>
                    {item.stage || item.status ? (
                      <StatusBadge status={item.stage || item.status} bordered />
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                    <span>{item.company || "—"}</span>
                    <span>{item.route || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-border/40">
                    <div className="flex items-center gap-2">
                      {item.priority ? <StatusBadge status={item.priority} bordered /> : null}
                      <span className="text-[11px] text-muted-foreground">Next: {item.nextFollowUp || "—"}</span>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <RowActionsMenu items={rowActions(item)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-white text-[12px] font-montserrat text-muted-foreground">
              <span>{totalCount} {totalCount === 1 ? "Lead" : "Leads"} · Page {page} of {totalPages}</span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-[11px] gap-1 cursor-pointer"
                  disabled={page <= 1}
                  onClick={() => onPageChange?.(page - 1)}
                >
                  <ChevronLeft className="size-3" />
                  Prev
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="h-7 w-7 p-0 text-[11px] bg-[#252832] text-white"
                >
                  {page}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-[11px] gap-1 cursor-pointer"
                  disabled={page >= totalPages}
                  onClick={() => onPageChange?.(page + 1)}
                >
                  Next
                  <ChevronRight className="size-3" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
