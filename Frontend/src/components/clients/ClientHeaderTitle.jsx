"use client";

import StatusBadge from "@/components/common/StatusBadge";

export default function ClientHeaderTitle({ client }) {
  if (!client) return null;

  const initials = client.name && client.name !== "—"
    ? client.name
        .split(" ")
        .map((n) => n[0])
        .filter(Boolean)
        .join("")
        .slice(0, 2)
    : "—";

  const company = client.company && client.company !== "—" ? client.company : null;
  const clientType = client.type && client.type !== "—" ? `${client.type} Client` : null;
  const brokerName = client.broker && client.broker !== "—" ? client.broker : "Unassigned";

  const metaItems = [
    company,
    clientType,
    `Broker: ${brokerName}`,
  ].filter(Boolean);

  return (
    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
      <div className="size-12 sm:size-14 rounded-full bg-[#F3F4F6] text-foreground flex items-center justify-center font-montserrat font-bold text-[18px] sm:text-[20px] border border-border shrink-0">
        {initials}
      </div>
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="font-montserrat font-bold text-[20px] sm:text-[22px] text-foreground leading-tight truncate">
            {client.name || "—"}
          </h1>
          {client.status && <StatusBadge status={client.status} bordered />}
        </div>
        <p className="font-montserrat text-[12px] sm:text-[13px] text-muted-foreground flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {metaItems.map((item, index) => (
            <span key={index} className="flex items-center gap-1.5 sm:gap-2">
              {index > 0 && <span>•</span>}
              <span>{item}</span>
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
