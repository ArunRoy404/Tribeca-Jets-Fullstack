"use client";

import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

const FIGMA_PREVIEW_LEADS = [
  {
    id: "lead-1",
    name: "Jonathan Reed",
    company: "Reed Capital",
    email: "jonathan.reed@reedcapital.com",
    phone: "+1 (212) 555-0141",
    source: "Direct",
    route: "KTEB → KMIA",
    priority: "High",
    nextFollowUp: "Aug 15, 2026",
    status: "New",
    created: "Aug 15, 2026",
  },
  {
    id: "lead-2",
    name: "Emily Carter",
    company: "Carter Holdings",
    email: "emily.carter@carterholdings.com",
    phone: "+1 (305) 555-0192",
    source: "Website",
    route: "KTEB → KMIA",
    priority: "Medium",
    nextFollowUp: "Aug 14, 2026",
    status: "Contacted",
    created: "Aug 5, 2026",
  },
  {
    id: "lead-3",
    name: "Daniel Brooks",
    company: "Brooks Group",
    email: "d.brooks@brooksgroup.com",
    phone: "+1 (424) 555-0178",
    source: "Referral",
    route: "KTEB → KMIA",
    priority: "High",
    nextFollowUp: "Aug 10, 2026",
    status: "Qualified",
    created: "Aug 3, 2026",
  },
  {
    id: "lead-4",
    name: "Sophia Morgan",
    company: "Reed Capital",
    email: "sophia.morgan@morgan.com",
    phone: "+1 (646) 555-0185",
    source: "Email",
    route: "KTEB → KMIA",
    priority: "Low",
    nextFollowUp: "Aug 18, 2026",
    status: "Proposal",
    created: "Jul 28, 2026",
  },
  {
    id: "lead-5",
    name: "Marcus Webb",
    company: "Webb Enterprises",
    email: "marcus.webb@webb.com",
    phone: "+1 (713) 555-0132",
    source: "Referral",
    route: "KTEB → KMIA",
    priority: "High",
    nextFollowUp: "Aug 15, 2026",
    status: "New",
    created: "Aug 9, 2026",
  },
  {
    id: "lead-6",
    name: "James Holloway",
    company: "Holloway LLC",
    email: "james.holloway@holloway.com",
    phone: "+1 (404) 555-0159",
    source: "Direct",
    route: "KTEB → KMIA",
    priority: "High",
    nextFollowUp: "Aug 10, 2026",
    status: "Won",
    created: "Jun 28, 2026",
  },
];

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

export default function AgentAssignedLeadsTable({
  leads = [],
  agentName = "Barry",
  onSelectLead,
}) {
  // Use real leads if available, or fallback to Figma mockup data for initial preview
  const displayLeads = leads && leads.length > 0 ? leads : FIGMA_PREVIEW_LEADS;

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex items-center justify-between">
        <h3 className="font-montserrat font-bold text-[14px] text-foreground">
          {displayLeads.length} leads assigned to {agentName}
        </h3>
      </div>

      <div className="rounded-lg border border-border bg-white shadow-card overflow-hidden w-full">
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
              {displayLeads.map((item) => (
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
                      <StatusBadge status={item.priority || "Medium"} bordered />
                    </div>
                  </TableCell>
                  <TableCell className="p-3 font-montserrat text-[11px] text-foreground text-center whitespace-nowrap">
                    {item.nextFollowUp || "—"}
                  </TableCell>
                  <TableCell className="p-3 text-center">
                    <div className="flex justify-center">
                      <StatusBadge status={item.status || item.stage || "New"} bordered />
                    </div>
                  </TableCell>
                  <TableCell className="p-3 font-montserrat text-[11px] text-muted-foreground text-center whitespace-nowrap">
                    {item.created || item.createdAt || "—"}
                  </TableCell>
                  <TableCell
                    className="p-3 text-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex justify-center">
                      <RowActionsMenu
                        items={[
                          { label: "View Lead", onSelect: () => onSelectLead?.(item.id) },
                          { label: "Schedule Follow-up", onSelect: () => {} },
                          { label: "Convert to Client", onSelect: () => {} },
                        ]}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards view (<lg) */}
        <div className="flex flex-col divide-y divide-border lg:hidden">
          {displayLeads.map((item) => (
            <div
              key={item.id}
              className="p-3.5 flex flex-col gap-2 font-montserrat text-[12px] bg-white hover:bg-muted/10 transition-colors"
              onClick={() => onSelectLead?.(item.id)}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-[13px] text-foreground">{item.name}</span>
                <StatusBadge status={item.status || item.stage || "New"} bordered />
              </div>
              <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                <span>{item.company}</span>
                <span>{item.route}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-border/40">
                <div className="flex items-center gap-2">
                  <StatusBadge status={item.priority || "Medium"} bordered />
                  <span className="text-[11px] text-muted-foreground">Next: {item.nextFollowUp}</span>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <RowActionsMenu
                    items={[
                      { label: "View Lead", onSelect: () => onSelectLead?.(item.id) },
                    ]}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination Footer matching Figma */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-white text-[12px] font-montserrat text-muted-foreground">
          <span>{displayLeads.length} Requests · Page 1 of 1</span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-[11px] gap-1 cursor-pointer"
              disabled
            >
              <ChevronLeft className="size-3" />
              Prev
            </Button>
            <Button
              variant="default"
              size="sm"
              className="h-7 w-7 p-0 text-[11px] bg-[#252832] text-white"
            >
              1
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-[11px] gap-1 cursor-pointer"
              disabled
            >
              Next
              <ChevronRight className="size-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
