"use client";

import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { Checkbox } from "@/components/ui/checkbox";

function Field({ label, value, valueClassName = "text-foreground" }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <p className="font-montserrat text-[10px] text-muted-foreground whitespace-nowrap">{label}</p>
      <div className={`font-montserrat font-bold text-[12px] truncate ${valueClassName}`}>{value}</div>
    </div>
  );
}

export default function EmailTemplateCard({ template, selected, onToggleSelect, actions, onClick }) {
  if (!template) return null;

  return (
    <div
      onClick={onClick}
      className={`flex flex-col gap-2.5 items-start p-3 w-full rounded-sm border border-border bg-white ${
        onClick ? "cursor-pointer hover:bg-secondary/40 transition-colors" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2 w-full">
        <div className="flex items-center gap-2 min-w-0">
          <span onClick={(e) => e.stopPropagation()}>
            <Checkbox checked={selected} onCheckedChange={onToggleSelect} />
          </span>
          <p className="font-montserrat font-bold text-[13px] text-foreground truncate">{template?.name}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <StatusBadge status={template?.status} bordered />
          {actions && <RowActionsMenu items={actions} />}
        </div>
      </div>

      <div className="flex items-start justify-between gap-3 w-full">
        <Field label="Category" value={<StatusBadge status={template?.category} bordered />} />
        <Field label="Last Updated" value={template?.lastUpdated} />
      </div>

      <div className="flex flex-col gap-0.5 w-full pt-1">
        <p className="font-montserrat text-[10px] text-muted-foreground">Subject</p>
        <p className="font-montserrat font-semibold text-[12px] text-foreground truncate">{template?.subject}</p>
      </div>
    </div>
  );
}
