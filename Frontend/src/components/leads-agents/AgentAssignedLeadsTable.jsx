"use client";

import { useState } from "react";
import { ArrowRight, Eye, Calendar, UserCheck } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import TablePagination from "@/components/table/common/TablePagination";
import AgentAssignedLeadCardsContainer from "./AgentAssignedLeadCardsContainer";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const columns = [
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

const LEADS_PAGE_SIZE = 5;

export default function AgentAssignedLeadsTable({ agent, leads = [] }) {
  const [page, setPage] = useState(1);

  const agentFirstName = agent?.name?.split(" ")[0] || "Agent";
  const totalCount = leads.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / LEADS_PAGE_SIZE));
  const startIndex = (page - 1) * LEADS_PAGE_SIZE;
  const pageItems = leads.slice(startIndex, startIndex + LEADS_PAGE_SIZE);

  const getRowActions = (lead) => [
    {
      label: "View Lead Details",
      icon: <Eye className="size-4" />,
      onSelect: () => alert(`Viewing lead: ${lead.leadName}`),
    },
    {
      label: "Schedule Follow-up",
      icon: <Calendar className="size-4" />,
      onSelect: () => alert(`Schedule follow-up for ${lead.leadName}`),
    },
    {
      label: "Reassign Lead",
      icon: <UserCheck className="size-4" />,
      onSelect: () => alert(`Reassigning lead ${lead.leadName}`),
    },
  ];

  return (
    <div className="flex flex-col items-start rounded-lg border border-border overflow-hidden w-full bg-white shadow-xs">
      {/* Header bar */}
      <div className="flex items-center justify-between p-4 border-b border-border w-full bg-white">
        <h3 className="font-montserrat font-bold text-[16px] text-foreground">
          {totalCount} leads assigned to {agentFirstName}
        </h3>
      </div>

      {/* Mobile Card View */}
      <div className="w-full lg:hidden p-3">
        <AgentAssignedLeadCardsContainer leads={pageItems} getRowActions={getRowActions} />
      </div>

      {/* Desktop Table View */}
      <div className="w-full overflow-x-auto hidden lg:block">
        <Table className="min-w-[1000px]">
          <TableHeader>
            <TableRow className="bg-black/5 border-border hover:bg-black/5">
              {columns.map((col) => (
                <TableHead
                  key={col}
                  className="p-[12px] font-montserrat font-semibold text-[12px] text-foreground text-center whitespace-nowrap h-auto"
                >
                  {col}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.map((item) => (
              <TableRow key={item.id} className="border-border hover:bg-purple/5 transition-colors">
                <TableCell className="p-[12px] font-montserrat font-semibold text-[12px] text-foreground text-left whitespace-nowrap">
                  {item.leadName}
                </TableCell>
                <TableCell className="p-[12px] font-montserrat font-semibold text-[12px] text-foreground text-center whitespace-nowrap">
                  {item.company}
                </TableCell>
                <TableCell className="p-[12px] font-montserrat text-center whitespace-nowrap">
                  <div className="flex flex-col items-center">
                    <span className="font-semibold text-[12px] text-foreground">{item.email}</span>
                    <span className="text-[11px] text-muted-foreground">{item.phone}</span>
                  </div>
                </TableCell>
                <TableCell className="p-[12px] text-center whitespace-nowrap">
                  <StatusBadge status={item.source} className="text-[11px] px-2 py-0.5" />
                </TableCell>
                <TableCell className="p-[12px] text-center whitespace-nowrap">
                  <div className="inline-flex items-center gap-1.5 font-montserrat font-bold text-[12px] text-purple">
                    <span>{item.origin}</span>
                    <ArrowRight className="size-3.5 text-muted-foreground" />
                    <span>{item.destination}</span>
                  </div>
                </TableCell>
                <TableCell className="p-[12px] text-center whitespace-nowrap">
                  <div className="flex justify-center">
                    <StatusBadge status={item.priority} bordered />
                  </div>
                </TableCell>
                <TableCell className="p-[12px] font-montserrat font-semibold text-[12px] text-foreground text-center whitespace-nowrap">
                  {item.nextFollowUp}
                </TableCell>
                <TableCell className="p-[12px] text-center whitespace-nowrap">
                  <div className="flex justify-center">
                    <StatusBadge status={item.status} bordered />
                  </div>
                </TableCell>
                <TableCell className="p-[12px] font-montserrat font-semibold text-[12px] text-foreground text-center whitespace-nowrap">
                  {item.createdDate}
                </TableCell>
                <TableCell className="p-[12px] text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-center">
                    <RowActionsMenu items={getRowActions(item)} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {pageItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} className="p-8 text-center font-montserrat text-[13px] text-muted-foreground">
                  No assigned leads found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      <div className="w-full">
        <TablePagination
          totalCount={totalCount}
          itemLabel="requests"
          page={page}
          pageCount={pageCount}
          onPrev={() => setPage((p) => Math.max(p - 1, 1))}
          onNext={() => setPage((p) => Math.min(p + 1, pageCount))}
        />
      </div>
    </div>
  );
}

