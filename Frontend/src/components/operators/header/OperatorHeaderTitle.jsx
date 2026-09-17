"use client";

import { Building2 } from "lucide-react";

export default function OperatorHeaderTitle({ operator }) {
  if (!operator) return null;

  const name = operator.name;
  const location = operator.homeBase && operator.homeBase !== "—" ? operator.homeBase : "Base not on file";
  const tripsCount = operator.totalTrips && operator.totalTrips !== "—" ? `${operator.totalTrips} trips` : null;
  const totalPaid = operator.totalPaid && operator.totalPaid !== "—" ? `${operator.totalPaid} total paid` : null;
  const statusLabel = operator.status;

  const subtitleParts = [location, tripsCount, totalPaid].filter(Boolean);

  return (
    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
      <div className="size-12 sm:size-14 rounded-xl bg-purple/10 text-purple border border-purple/20 flex items-center justify-center shrink-0 shadow-xs">
        <Building2 className="size-6 text-purple" />
      </div>

      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="font-montserrat font-bold text-[20px] sm:text-[24px] text-foreground leading-tight truncate">
            {name}
          </h1>
          {statusLabel && (
            <span className="px-2 py-0.5 rounded font-montserrat font-medium text-[11px] border border-border/80 bg-secondary/50 text-muted-foreground">
              {statusLabel}
            </span>
          )}
        </div>
        <p className="font-montserrat text-[12px] sm:text-[13px] text-muted-foreground">
          {subtitleParts.join(" · ")}
        </p>
      </div>
    </div>
  );
}
