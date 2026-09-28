"use client";

import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";

/**
 * One referral as a card — the desk's board below `lg`, and the agent's
 * "My Referrals" list, which passes no actions.
 */
export default function ReferralCard({ item, actions, onClick, showAgent = true }) {
  return (
    <div
      onClick={onClick}
      className="bg-white border border-border rounded-md p-4 flex flex-col gap-3 shadow-card cursor-pointer hover:border-purple/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="font-montserrat font-bold text-[14px] text-foreground truncate">{item?.clientName}</span>
          <span className="font-montserrat font-semibold text-[11px] text-purple">
            {item?.reference}
            {showAgent && item?.agent !== "—" ? ` · ${item?.agent}` : ""}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          <StatusBadge status={item?.status} bordered />
          {actions?.length > 0 && <RowActionsMenu items={actions} />}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border font-montserrat text-[12px]">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[10px] text-muted-foreground">Route</span>
          <span className="font-semibold text-foreground truncate">{item?.route}</span>
        </div>
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[10px] text-muted-foreground">Departure</span>
          <span className="font-semibold text-foreground truncate">{item?.departure}</span>
        </div>
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[10px] text-muted-foreground">Passengers</span>
          <span className="font-semibold text-foreground">{item?.passengers}</span>
        </div>
      </div>
    </div>
  );
}
