"use client";

import StatusBadge from "@/components/common/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const columns = ["Lead", "Email", "Source", "Priority", "Next Follow-up", "Stage"];

/** The leads currently assigned to this broker. Real rows, or an empty state. */
export default function AgentAssignedLeadsTable({ leads = [] }) {
  if (leads.length === 0) {
    return (
      <div className="hidden lg:flex flex-col items-center justify-center p-12 text-center bg-white rounded-md border border-border w-full">
        <p className="font-montserrat font-bold text-[16px] text-foreground">No Leads Assigned</p>
        <p className="font-montserrat text-[13px] text-muted-foreground mt-1">
          Leads assigned to this broker will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-x-auto hidden lg:block rounded-md border border-border">
      <Table className="min-w-[900px]">
        <TableHeader>
          <TableRow className="bg-black/5 border-border hover:bg-black/5">
            {columns.map((col) => (
              <TableHead
                key={col}
                className="p-[10px] font-montserrat font-bold text-[12px] text-foreground text-center whitespace-nowrap h-auto"
              >
                {col}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead.id} className="border-border">
              <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-foreground text-left">
                {lead.name}
              </TableCell>
              <TableCell className="p-[10px] font-montserrat text-[12px] text-foreground text-center">
                {lead.email}
              </TableCell>
              <TableCell className="p-[10px] font-montserrat text-[12px] text-foreground text-center">
                {lead.source || "—"}
              </TableCell>
              <TableCell className="p-[10px] text-center">
                <div className="flex justify-center">
                  {lead.priority ? <StatusBadge status={lead.priority} bordered /> : null}
                </div>
              </TableCell>
              <TableCell className="p-[10px] font-montserrat text-[12px] text-foreground text-center">
                {lead.nextFollowUp}
              </TableCell>
              <TableCell className="p-[10px] text-center">
                <div className="flex justify-center">
                  {lead.stage ? <StatusBadge status={lead.stage} bordered /> : null}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
