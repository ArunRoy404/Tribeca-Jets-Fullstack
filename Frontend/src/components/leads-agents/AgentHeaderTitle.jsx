"use client";

import StatusBadge from "@/components/common/StatusBadge";
import { formatUserRole } from "@/lib/user";

export default function AgentHeaderTitle({ agent }) {
  if (!agent) return null;

  const displayName = agent.name || "Barry Wilson";
  const displayStatus = agent.status || "ACTIVE";
  const displayCompany = agent.company || "Sterling Group";
  const displayEmail = agent.email || "hope.sterling@sterlinggroup.com";
  const displayPhone = agent.phone || "+1 (212) 555-0184";

  const metaParts = [
    displayCompany,
    displayEmail,
    displayPhone,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-2.5 flex-wrap">
        <h1 className="font-montserrat font-bold text-[18px] sm:text-[22px] text-foreground leading-tight">
          {displayName}
        </h1>
        {displayStatus ? (
          <StatusBadge status={displayStatus} bordered />
        ) : null}
      </div>

      <p className="font-montserrat text-[12px] sm:text-[13px] text-muted-foreground flex items-center gap-2 flex-wrap">
        {metaParts.join(" • ")}
      </p>
    </div>
  );
}
