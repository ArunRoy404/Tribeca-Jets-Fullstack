"use client";

import StatusBadge from "@/components/common/StatusBadge";

/** The sent log below `lg`: one card per email. */
export default function SentEmailsCardsContainer({ emails, onSelectEmail }) {
  return (
    <div className="lg:hidden flex flex-col gap-3 p-3 w-full">
      {emails?.map((email) => (
        <button
          key={email?.id}
          type="button"
          onClick={() => onSelectEmail?.(email?.id)}
          className="flex flex-col gap-2 items-start p-3 w-full rounded-sm border border-border bg-white text-left cursor-pointer hover:bg-secondary/40 transition-colors"
        >
          <div className="flex items-center justify-between gap-2 w-full">
            <p className="font-montserrat font-bold text-[13px] text-foreground truncate">{email?.to}</p>
            <StatusBadge status={email?.statusLabel} bordered />
          </div>
          <p className="font-montserrat font-semibold text-[12px] text-foreground truncate w-full">{email?.subject}</p>
          <p className="font-montserrat text-[11px] text-muted-foreground">
            {email?.sentAt} · {email?.sentBy}
          </p>
        </button>
      ))}
    </div>
  );
}
