"use client";

import LeadCard from "./LeadCard";
import { useRouter } from "next/navigation";
import { useLeadsAgentsStore, LEADS_PAGE_SIZE } from "@/store/useLeadsAgentsStore";

export default function LeadCardsContainer({ getRowActions }) {
  const router = useRouter();
  const getFilteredLeads = useLeadsAgentsStore((s) => s.getFilteredLeads);
  const selectLead = useLeadsAgentsStore((s) => s.selectLead);
  const leadsPage = useLeadsAgentsStore((s) => s.leadsPage);

  const filtered = getFilteredLeads();
  const startIndex = (leadsPage - 1) * LEADS_PAGE_SIZE;
  const paginated = filtered.slice(startIndex, startIndex + LEADS_PAGE_SIZE);

  if (paginated.length === 0) {
    return (
      <div className="lg:hidden flex flex-col items-center justify-center p-8 text-center bg-white rounded-lg border border-border">
        <p className="font-montserrat font-medium text-[14px] text-muted-foreground">
          No leads found matching search filters.
        </p>
      </div>
    );
  }

  return (
    <div className="lg:hidden flex flex-col gap-3 w-full">
      {paginated.map((item) => (
        <LeadCard
          key={item.id}
          item={item}
          actions={getRowActions ? getRowActions(item) : []}
          onClick={() => {
            selectLead(item.id);
            router.push(`/dashboard/leads-agents/leads/${encodeURIComponent(item.id)}`);
          }}
        />
      ))}
    </div>
  );
}

