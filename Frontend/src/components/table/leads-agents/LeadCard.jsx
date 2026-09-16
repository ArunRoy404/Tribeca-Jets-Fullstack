"use client";

import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import RestoredBadge from "@/components/common/RestoredBadge";

function Field({ label, value }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <p className="font-montserrat text-[10px] text-muted-foreground whitespace-nowrap">{label}</p>
      <div className="font-montserrat font-bold text-[12px] text-foreground truncate">{value}</div>
    </div>
  );
}

export default function LeadCard({ lead, actions, onClick, archived = false }) {
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
            {lead?.name}
          </p>
          {lead?.company && lead.company !== "—" ? (
            <p className="font-montserrat text-[11px] text-muted-foreground truncate">
              {lead.company}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {lead?.isRestored ? (
            <RestoredBadge at={lead?.restoredAtLabel} by={lead?.restoredByName} />
          ) : null}
          {lead?.stage ? <StatusBadge status={lead.stage} bordered /> : null}
          {actions ? <RowActionsMenu items={actions} /> : null}
        </div>
      </div>

      <div className="flex items-start justify-between gap-3 w-full">
        <Field label="Route" value={lead?.route} />
        <Field label="Source" value={lead?.source} />
        <Field label="Priority" value={lead?.priority} />
      </div>

      <div className="flex items-end justify-between gap-3 w-full pt-2 border-t border-border">
        {archived ? (
          <>
            <Field label="Removed On" value={lead?.deletedAtLabel} />
            <Field label="Removed By" value={lead?.deletedByName} />
          </>
        ) : (
          <>
            <Field label="Broker" value={lead?.brokerName} />
            <Field label="Next Follow-up" value={lead?.nextFollowUp} />
          </>
        )}
      </div>
    </div>
  );
}
