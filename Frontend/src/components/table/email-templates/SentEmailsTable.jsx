"use client";

import StatusBadge from "@/components/common/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const COLUMNS = ["Sent", "To", "Subject", "About", "Template", "Sent By", "Status"];

/** The sent log (#21): every email the CRM sent, or tried to — read-only. */
export default function SentEmailsTable({ emails, onSelectEmail }) {
  return (
    <div className="relative w-full overflow-x-auto hidden lg:block">
      <Table className="min-w-[1000px]">
        <TableHeader>
          <TableRow className="bg-black/5 border-border hover:bg-black/5">
            {COLUMNS.map((col) => (
              <TableHead key={col} className="p-[10px] font-montserrat font-bold text-[12px] text-foreground whitespace-nowrap h-auto">
                {col}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {emails?.map((email) => (
            <TableRow
              key={email?.id}
              className="border-border cursor-pointer hover:bg-secondary/40 transition-colors"
              onClick={() => onSelectEmail?.(email?.id)}
            >
              <TableCell className="p-[10px] font-montserrat text-[12px] text-muted-foreground whitespace-nowrap">{email?.sentAt}</TableCell>
              <TableCell className="p-[10px] font-montserrat text-[12px] text-foreground">
                <div className="flex flex-col">
                  <span className="font-bold">{email?.to}</span>
                  <span className="text-muted-foreground">{email?.toEmail}</span>
                </div>
              </TableCell>
              <TableCell className="p-[10px] font-montserrat font-semibold text-[12px] text-foreground max-w-[300px] truncate" title={email?.subject}>
                {email?.subject}
              </TableCell>
              <TableCell className="p-[10px] font-montserrat text-[12px] text-foreground whitespace-nowrap">{email?.about}</TableCell>
              <TableCell className="p-[10px] font-montserrat text-[12px] text-foreground">{email?.template}</TableCell>
              <TableCell className="p-[10px] font-montserrat text-[12px] text-foreground whitespace-nowrap">{email?.sentBy}</TableCell>
              <TableCell className="p-[10px]" title={email?.statusHint}>
                <StatusBadge status={email?.statusLabel} bordered />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
