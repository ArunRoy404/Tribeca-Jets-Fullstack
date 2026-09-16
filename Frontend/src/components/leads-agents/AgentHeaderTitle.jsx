"use client";

import StatusBadge from "@/components/common/StatusBadge";
import { formatUserRole } from "@/lib/user";

/**
 * AgentHeaderTitle
 *
 * API Integration Guidelines:
 * - Data source: `agent` row mapped from `GET /api/clients/broker-performance` or `GET /api/users/{id}`
 * - Fields:
 *   - name: string (User.firstName + User.lastName)
 *   - status: "ACTIVE" | "SUSPENDED" | "INVITED"
 *   - role: UserRole enum (e.g. "SENIOR_BROKER", "BROKER")
 *   - email: string
 *   - phone: string
 *
 * Missing fields render honest em dashes per project agreement.
 */
export default function AgentHeaderTitle({ agent }) {
  if (!agent) return null;

  const displayName = agent.name || "—";
  const displayStatus = agent.status || null;
  const displayRole = agent.role ? formatUserRole(agent.role) : null;
  const displayEmail = agent.email && agent.email !== "—" ? agent.email : null;
  const displayPhone = agent.phone && agent.phone !== "—" ? agent.phone : null;

  const metaParts = [
    displayRole,
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

      {metaParts.length > 0 ? (
        <p className="font-montserrat text-[12px] sm:text-[13px] text-muted-foreground flex items-center gap-2 flex-wrap">
          {metaParts.join(" • ")}
        </p>
      ) : (
        <p className="font-montserrat text-[12px] sm:text-[13px] text-muted-foreground">
          No contact details on file
        </p>
      )}
    </div>
  );
}
