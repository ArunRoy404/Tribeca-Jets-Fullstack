"use client";

import { ArrowRight } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { cn } from "@/lib/utils";

function Field({ label, value, valueClassName }) {
  if (value === undefined || value === null) return null;
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <p className="font-montserrat text-[10px] text-muted-foreground whitespace-nowrap">{label}</p>
      <p className={cn("font-montserrat font-medium text-[12px] text-foreground truncate", valueClassName)}>
        {value}
      </p>
    </div>
  );
}

export default function QuoteCard({ item, actions, onClick }) {
  return (
    <div
      onClick={onClick}
      className="flex flex-col gap-3 p-3.5 w-full rounded-lg border border-border bg-white shadow-card cursor-pointer hover:border-purple/40 transition-colors"
    >
      <div className="flex items-center justify-between gap-2 w-full">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-montserrat font-bold text-[13px] text-purple truncate">
            {item?.id}
          </span>
          {item?.clientTier === "VIP" && (
            <span className="px-1.5 py-0.2 rounded font-montserrat font-bold text-[9px] bg-warning/15 text-warning border border-warning/30">
              VIP
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {item?.status && <StatusBadge status={item?.status} bordered />}
          {actions && <RowActionsMenu items={actions} />}
        </div>
      </div>

      <div className="flex flex-col gap-1 w-full">
        <h4 className="font-montserrat font-bold text-[14px] text-foreground leading-tight truncate">
          {item?.client}
        </h4>
        <div className="flex items-center gap-1.5 font-montserrat font-semibold text-[12px] text-purple">
          <span>{item?.origin}</span>
          <ArrowRight className="size-3.5 text-muted-foreground" />
          <span>{item?.destination}</span>
          <span className="text-muted-foreground font-normal text-[11px] ml-1">
            • {item?.date}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 w-full bg-secondary/30 p-2.5 rounded-md text-[12px]">
        <Field label="Aircraft" value={item?.aircraft} />
        <div className="flex flex-col gap-0.5 min-w-0">
          <p className="font-montserrat text-[10px] text-muted-foreground">Version</p>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground w-fit">
            {item?.version}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 w-full items-center border-t border-border/50 pt-2 text-[11px]">
        <Field label="Base Price" value={item?.basePriceFormatted} />
        <Field label="FET (7.5%)" value={item?.fetFormatted} />
        <Field
          label="Total"
          value={item?.totalPriceFormatted}
          valueClassName="font-bold text-success text-[13px]"
        />
      </div>

      <div className="flex items-center justify-between border-t border-border/50 pt-2 text-[11px]">
        <Field label="Broker" value={item?.broker} valueClassName="font-semibold" />
      </div>
    </div>
  );
}
