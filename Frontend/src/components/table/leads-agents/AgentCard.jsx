"use client";

import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { formatUserRole } from "@/lib/user";

function Field({ label, value }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <p className="font-montserrat text-[10px] text-muted-foreground whitespace-nowrap">{label}</p>
      <div className="font-montserrat font-bold text-[12px] text-foreground truncate">{value}</div>
    </div>
  );
}

export default function AgentCard({ agent, actions, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`flex flex-col gap-2.5 items-start p-3 w-full rounded-sm border border-border bg-white ${
        onClick ? "cursor-pointer hover:bg-secondary/40" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2 w-full">
        <div className="flex flex-col min-w-0">
          <p className="font-montserrat font-semibold text-[13px] text-purple truncate">
            {agent?.name}
          </p>
          <p className="font-montserrat text-[11px] text-muted-foreground truncate">
            {formatUserRole(agent?.role)}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {agent?.status ? <StatusBadge status={agent.status} bordered /> : null}
          {actions ? <RowActionsMenu items={actions} /> : null}
        </div>
      </div>

      <div className="flex items-start justify-between gap-3 w-full">
        <Field label="Active Leads" value={agent?.activeLeads} />
        <Field label="Converted" value={agent?.convertedLeads} />
        <Field label="Conversion" value={agent?.conversionRate} />
      </div>

      <div className="flex items-end justify-between gap-3 w-full pt-2 border-t border-border">
        <Field label="Follow-ups Due" value={agent?.followUpsDue} />
        <Field label="Active Trips" value={agent?.activeTrips} />
      </div>
    </div>
  );
}
